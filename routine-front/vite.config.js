import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API_TARGET = process.env.ROUTINE_API_URL ?? "http://localhost:3334";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app (PWA). Only the built files are cached: never /api
    // (private data that depends on the session cookie). See README → PWA.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "nuCorre",
        short_name: "nuCorre",
        description: "Sua rotina do dia, da semana e o que aconteceu de verdade.",
        lang: "pt-BR",
        start_url: "/hoje",
        scope: "/",
        display: "standalone",
        background_color: "#faf3e8",
        theme_color: "#faf3e8",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.startsWith("/api"), handler: "NetworkOnly" }],
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5174,
    strictPort: true,
    // The browser only talks to the Vite origin; /api is forwarded to routine-back.
    // Same origin => the HttpOnly session cookie works without CORS.
    proxy: { "/api": { target: API_TARGET, changeOrigin: false } },
  },
  preview: {
    port: 4174,
    proxy: { "/api": { target: API_TARGET, changeOrigin: false } },
  },
  test: {
    include: ["src/**/*.test.js"],
    environment: "node",
  },
});
