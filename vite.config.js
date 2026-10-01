import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

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
        VitePWA({
            strategies: "injectManifest",
            srcDir: "resources/js/pwa",
            filename: "serviceWorker.ts",
            injectRegister: null,
            registerType: "prompt",
            scope: "/relawan/",
            buildBase: "/build/",
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
                manifestTransforms: [async (entries) => ({
                    manifest: entries.filter(({ url }) =>
                        /(?:\/build\/)?(?:offline\.html|manifest\.webmanifest|assets\/(?:offline|relawanContinuity)-[^/]+\.js)$/.test(url)
                        || url === "/pwa-192.png" || url === "/pwa-512.png"),
                    warnings: [],
                })],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
});
