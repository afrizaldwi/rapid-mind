import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/js/app.ts", "offline.html"],
            refresh: true,
        }),

        vue({
            template: {
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),

        tailwindcss(),
        {
            name: "vite-serve-manifest",
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    const pathname = req.url ? req.url.split("?")[0] : "";
                    if (pathname === "/manifest.webmanifest" || pathname === "/manifest.json" || pathname === "/build/manifest.webmanifest") {
                        res.setHeader("Content-Type", "application/manifest+json");
                        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                        res.setHeader("Access-Control-Allow-Origin", "*");
                        res.statusCode = 200;
                        res.end(readFileSync(new URL("./public/manifest.webmanifest", import.meta.url), "utf8"));
                        return;
                    }
                    next();
                });
            },
        },
        VitePWA({
            strategies: "injectManifest",
            srcDir: "resources/js/pwa",
            filename: "serviceWorker.ts",
            injectRegister: null,
            registerType: "prompt",
            scope: "/relawan/",
            buildBase: "/build/",
            integration: {
                beforeBuildServiceWorker(options) {
                    // The plugin also adds a root-relative manifest entry. Laravel serves it under /build/.
                    options.injectManifest.additionalManifestEntries =
                        (options.injectManifest.additionalManifestEntries ?? []).filter(
                            (entry) => typeof entry === "string" ? entry !== "manifest.webmanifest" : entry.url !== "manifest.webmanifest",
                        );
                },
            },
            manifest: {
                name: "RAPID-MIND Relawan",
                short_name: "RAPID-MIND",
                description: "Dukungan respons kesehatan jiwa bencana untuk Relawan",
                lang: "id",
                display: "standalone",
                start_url: "/relawan/home",
                scope: "/relawan/",
                theme_color: "#0F766E",
                background_color: "#F1F5F9",
                icons: [
                    { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
                    { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
                ],
            },
            injectManifest: {
                globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
                maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
                modifyURLPrefix: { "": "/build/" },
                additionalManifestEntries: [
                    { url: "/pwa-192.png", revision: null },
                    { url: "/pwa-512.png", revision: null },
                ],
                manifestTransforms: [async (entries) => {
                    // Follow the offline HTML entry, including its route chunks and shared imports.
                    const manifest = JSON.parse(readFileSync(new URL("./public/build/manifest.json", import.meta.url), "utf8"));
                    const required = new Set(["offline.html", "manifest.webmanifest"]);
                    const visited = new Set();
                    function include(key) {
                        if (visited.has(key)) return;
                        visited.add(key);
                        const item = manifest[key];
                        if (!item) throw new Error(`Missing offline asset: ${key}`);
                        required.add(item.file);
                        for (const file of [...(item.css ?? []), ...(item.assets ?? [])]) required.add(file);
                        for (const dependency of [...(item.imports ?? []), ...(item.dynamicImports ?? [])]) include(dependency);
                    }
                    include("offline.html");
                    return {
                        manifest: entries.filter(({ url }) => required.has(url.replace(/^\/build\//, ""))
                            || url === "/pwa-192.png" || url === "/pwa-512.png"),
                        warnings: [],
                    };
                }],
            },
        }),
    ],
    server: {
        host: "0.0.0.0",
        port: 5173,
        origin: "http://localhost:5173",
        cors: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Private-Network": "true",
        },
    },
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
});
