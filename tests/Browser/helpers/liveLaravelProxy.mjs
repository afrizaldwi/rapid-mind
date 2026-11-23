import { createServer, request as upstreamRequest } from "node:http";
import { connect as connectSocket } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";

// New test profiles only: candidate assets are isolated, all permitted dynamic
// responses come from the running Laravel/Nginx. Never synthesizes auth/receipts.
export async function liveLaravelProxy(build, { published = false, healthcare = false, admin = false } = {}) {
    const origin = "http://localhost:8080";
    const log = [];
    const state = { offline: false, realtimeOffline: false };
    const css = new Set(); const visited = new Set();
    function include(key) {
        if (visited.has(key)) return; visited.add(key);
        const item = build.manifest[key];
        for (const file of item.css ?? []) css.add(file);
        for (const dependency of item.imports ?? []) include(dependency);
    }
    include("resources/js/app.ts");
    const appFile = build.manifest["resources/js/app.ts"].file;
    const server = createServer(async (req, res) => {
        const url = new URL(req.url, origin);
        const entry = { method: req.method, path: url.pathname, status: null, target: "blocked" };
        log.push(entry);
        if (state.offline) { entry.target = "disconnected-test-profile"; req.socket.destroy(); return; }
        const fail = status => { entry.status = status; res.writeHead(status, { "Cache-Control": "no-store" }).end(); };
        if (url.origin !== origin) return fail(403);
        if (!published && url.pathname.startsWith("/build/")) {
            const file = resolve(build.output, `.${url.pathname.slice(6)}`);
            if (!file.startsWith(build.output + sep) || !["GET", "HEAD"].includes(req.method)) return fail(403);
            try {
                const body = await readFile(file);
                const types = { ".js": "application/javascript", ".mjs": "application/javascript", ".css": "text/css", ".html": "text/html", ".webmanifest": "application/manifest+json", ".wasm": "application/wasm", ".png": "image/png" };
                entry.target = "candidate-assets"; entry.status = 200;
                res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache", ...(url.pathname === "/build/serviceWorker.js" ? { "Service-Worker-Allowed": "/" } : {}) }).end(body);
            } catch { fail(404); }
            return;
        }
        const read = ["GET", "HEAD"].includes(req.method) && (
            url.pathname === "/login" || url.pathname === "/" || url.pathname.startsWith("/relawan/") ||
            (published && url.pathname.startsWith("/build/")) ||
            (healthcare && (url.pathname.startsWith("/healthcare/") || url.pathname === "/up")) ||
            (admin && url.pathname.startsWith("/admin/")) ||
            ["/logo.png", "/pwa-192.png", "/pwa-512.png", "/favicon.ico", "/manifest.webmanifest"].includes(url.pathname));
        const write = req.method === "POST" && (
            ["/login", "/logout", "/relawan/sync/assessments", "/relawan/sync/emergencies"].includes(url.pathname) ||
            (healthcare && (url.pathname === "/broadcasting/auth" || /^\/healthcare\/emergencies\/[a-f0-9-]{36}\/(?:acknowledge|verify|classify)$/.test(url.pathname)))
        );
        if (!read && !write) return fail(403);
        const headers = { ...req.headers, host: "localhost:8080", "accept-encoding": "identity", connection: "close" };
        delete headers["proxy-connection"];
        entry.target = "live-laravel";
        const upstream = upstreamRequest({ hostname: "127.0.0.1", port: 8080, path: url.pathname + url.search, method: req.method, headers }, response => {
            const chunks = [];
            response.on("data", chunk => chunks.push(chunk));
            response.on("end", () => {
                let body = Buffer.concat(chunks);
                const out = { ...response.headers };
                delete out["transfer-encoding"]; delete out["content-length"]; delete out["content-encoding"];
                // Error documents are not Inertia apps; leave their real Laravel body intact.
                if (!published && (out["content-type"] ?? "").includes("text/html") && /\bdata-page\s*=/.test(body.toString("utf8"))) {
                    let html = body.toString("utf8");
                    html = html.replace(/<link\b[^>]*href=["'][^"']*(?:\/build\/|:5173\/)[^"']*["'][^>]*>/gi, "");
                    html = html.replace(/<script\b[^>]*src=["'][^"']*(?:\/build\/|:5173\/)[^"']*["'][^>]*>\s*<\/script>/gi, "");
                    html = html.replace("</head>", `${[...css].map(file => `<link rel="stylesheet" href="/build/${file}">`).join("")}<script type="module" src="/build/${appFile}"></script></head>`);
                    body = Buffer.from(html);
                    delete out.etag;
                }
                entry.status = response.statusCode;
                res.writeHead(response.statusCode, out).end(body);
            });
        });
        upstream.on("error", () => fail(502));
        req.pipe(upstream);
    });
    const tunnels = new Set();
    function relay(client, head, handshake) {
        const upstream = connectSocket(8080, "127.0.0.1");
        tunnels.add(upstream); tunnels.add(client);
        upstream.on("connect", () => {
            if (handshake) upstream.write(handshake);
            else client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
            if (head.length) upstream.write(head);
            client.pipe(upstream); upstream.pipe(client);
        });
        for (const [socket, peer] of [[client, upstream], [upstream, client]]) {
            socket.on("error", () => peer.destroy());
            socket.on("close", () => { tunnels.delete(socket); peer.destroy(); });
        }
    }
    server.on("connect", (req, socket, head) => {
        if (!healthcare || state.offline || state.realtimeOffline || req.url !== "localhost:8080") return socket.destroy();
        log.push({method:"CONNECT",path:"/app/[public-key]",target:"live-reverb-tunnel",status:200});
        relay(socket, head);
    });
    server.on("upgrade", (req, socket, head) => {
        const url = new URL(req.url, origin);
        if (!healthcare || state.offline || state.realtimeOffline || url.hostname !== "localhost" || url.port !== "8080" || !url.pathname.startsWith("/app/")) return socket.destroy();
        log.push({method:"UPGRADE",path:"/app/[public-key]",target:"live-reverb-tunnel",status:101});
        const headers = {...req.headers,host:"localhost:8080"};
        relay(socket, head, `GET ${url.pathname+url.search} HTTP/1.1\r\n${Object.entries(headers).map(([name,value])=>`${name}: ${value}`).join("\r\n")}\r\n\r\n`);
    });
    await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
    return { port: server.address().port, log, state, disconnectRealtime: () => { for (const socket of tunnels) socket.destroy(); }, close: async () => { for (const socket of tunnels) socket.destroy(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
