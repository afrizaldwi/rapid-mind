import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { project } from "./localPwaBuild.mjs";

export const origin = "http://localhost:8080";
export const patientName = "C1-SYNTHETIC-PATIENT";
export const assessmentPath = "/relawan/assessment/c1-assessment/srq";
export const ownerId = 910001;

// This is a closed HTTP proxy, not an upstream proxy. It NEVER forwards traffic.
// Chromium (including its worker) sees the exact enrollment origin; the owner's
// localhost:8080 server is never contacted. Authentication responses are synthetic.
export async function localPwaServer(build) {
    const state = {
        offline: false,
        hang: false,
        update: false,
        owner: ownerId,
        session: "AUTHENTICATED",
        denyEnrollment: false,
    };
    const log = [];
    const css = new Set();
    const visited = new Set();
    function include(key) {
        if (visited.has(key)) return;
        visited.add(key);
        const item = build.manifest[key];
        for (const file of item.css ?? []) css.add(file);
        for (const dependency of item.imports ?? []) include(dependency);
    }
    include("resources/js/app.ts");
    const appScript = build.manifest["resources/js/app.ts"].file;
    function page(url) {
        const srq = url.pathname === assessmentPath;
        const login = url.pathname === "/login";
        const payload = {
            component: login
                ? "Auth/Login"
                : srq
                  ? "Relawan/Assessment/Srq"
                  : "Relawan/Home",
            props: {
                errors: {},
                auth: {
                    user: login
                        ? null
                        : {
                              id: state.owner,
                              name: "C1 Synthetic Relawan",
                              role: "RELAWAN",
                              shelter_id: null,
                          },
                },
                ...(srq
                    ? {
                          assessment: {
                              id: "c1-assessment",
                              user_id: ownerId,
                              patient_id: "c1-patient",
                              mode: "VERBAL",
                              status: "IN_PROGRESS",
                              srq_responses: [],
                          },
                          patient: {
                              id: "c1-patient",
                              name: patientName,
                              age: 35,
                              gender: "Perempuan",
                              nik: null,
                          },
                          responses: {},
                          observations: {},
                      }
                    : {}),
            },
            url: url.pathname,
            version: "c1-production-assets",
            clearHistory: false,
            encryptHistory: !login,
        };
        return payload;
    }
    const server = createServer(async (request, response) => {
        try {
            const url = new URL(request.url, origin);
            log.push({
                method: request.method,
                path: url.origin === origin ? url.pathname : "FOREIGN_ORIGIN",
                outcome: "received",
            });
            const entry = log.at(-1);
            if (url.origin !== origin) {
                entry.outcome = "blocked-origin";
                response.writeHead(403).end();
                return;
            }
            if (!["GET", "HEAD"].includes(request.method)) {
                entry.outcome = "blocked-mutation";
                response
                    .writeHead(403, { "Cache-Control": "no-store" })
                    .end("C1 blocks all server mutations");
                return;
            }
            if (state.offline) {
                entry.outcome = "offline";
                request.socket.destroy();
                return;
            }
            if (state.hang && url.pathname === assessmentPath) {
                entry.outcome = "hanging-navigation";
                return;
            }
            const headers = {
                "Cache-Control": "private, no-store, max-age=0",
                Pragma: "no-cache",
            };
            if (
                url.pathname === "/relawan/session-status" ||
                url.pathname === "/relawan/offline-enrollment-status"
            ) {
                const enrollment = url.pathname.includes("enrollment");
                const allowed =
                    !state.denyEnrollment &&
                    state.session === "AUTHENTICATED" &&
                    Number(url.searchParams.get("owner_user_id")) ===
                        state.owner;
                const status = enrollment
                    ? allowed
                        ? 200
                        : 403
                    : state.session === "AUTHENTICATED"
                      ? 200
                      : state.session === "ACCOUNT_INACTIVE"
                        ? 403
                        : 401;
                response
                    .writeHead(status, {
                        ...headers,
                        "Content-Type": "application/json",
                    })
                    .end(
                        JSON.stringify({
                            state: enrollment
                                ? allowed
                                    ? "LOCAL_ENROLLMENT_ALLOWED"
                                    : "ENROLLMENT_DISABLED"
                                : state.session,
                            origin,
                            user: { id: state.owner, role: "RELAWAN" },
                        }),
                    );
                return;
            }
            if (
                url.pathname === "/relawan/patients/options" ||
                url.pathname.startsWith("/api/")
            ) {
                response
                    .writeHead(200, {
                        ...headers,
                        "Content-Type": "application/json",
                    })
                    .end(
                        JSON.stringify({ data: [], marker: "C1-PRIVATE-JSON" }),
                    );
                return;
            }
            if (
                url.pathname.startsWith("/relawan/") ||
                url.pathname === "/login"
            ) {
                const payload = page(url);
                if (request.headers["x-inertia"]) {
                    response
                        .writeHead(200, {
                            ...headers,
                            "Content-Type": "application/json",
                            "X-Inertia": "true",
                        })
                        .end(JSON.stringify(payload));
                    return;
                }
                const escaped = JSON.stringify(payload).replaceAll(
                    "<",
                    "\\u003c",
                );
                response
                    .writeHead(200, { ...headers, "Content-Type": "text/html" })
                    .end(
                        `<!doctype html><html lang="id"><head><meta name="csrf-token" content="c1-synthetic"><meta name="viewport" content="width=device-width, initial-scale=1">${[...css].map((file) => `<link rel="stylesheet" href="/build/${file}">`).join("")}<script type="module" src="/build/${appScript}"></script></head><body><script data-page="app" type="application/json">${escaped}</script><div id="app"></div></body></html>`,
                    );
                return;
            }
            const publicFiles = new Set([
                "/logo.png",
                "/pwa-192.png",
                "/pwa-512.png",
                "/manifest.webmanifest",
                "/favicon.ico",
            ]);
            const isBuild = url.pathname.startsWith("/build/");
            if (!isBuild && !publicFiles.has(url.pathname)) {
                response.writeHead(404).end();
                return;
            }
            const root = isBuild ? build.output : join(project, "public");
            const file = resolve(
                root,
                `.${isBuild ? url.pathname.slice(6) : url.pathname}`,
            );
            if (!file.startsWith(root + sep)) {
                response.writeHead(403).end();
                return;
            }
            const types = {
                ".js": "application/javascript",
                ".mjs": "application/javascript",
                ".css": "text/css",
                ".html": "text/html",
                ".webmanifest": "application/manifest+json",
                ".png": "image/png",
                ".wasm": "application/wasm",
                ".svg": "image/svg+xml",
            };
            let body = await readFile(file);
            if (url.pathname === "/build/serviceWorker.js" && state.update)
                body = Buffer.concat([
                    body,
                    Buffer.from(
                        "\n// C1 synthetic release B: identical application behavior\n",
                    ),
                ]);
            response
                .writeHead(200, {
                    "Content-Type":
                        types[extname(file)] ?? "application/octet-stream",
                    "Cache-Control": "no-cache",
                    ...(url.pathname === "/build/serviceWorker.js"
                        ? { "Service-Worker-Allowed": "/" }
                        : {}),
                })
                .end(body);
        } catch {
            response.writeHead(404).end();
        }
    });
    server.on("connect", (_request, socket) => {
        log.push({ outcome: "blocked-connect" });
        socket.destroy();
    });
    await new Promise((resolve, reject) =>
        server.once("error", reject).listen(0, "127.0.0.1", resolve),
    );
    return {
        state,
        log,
        port: server.address().port,
        close: async () => {
            server.closeAllConnections();
            await new Promise((resolve) => server.close(resolve));
        },
    };
}
