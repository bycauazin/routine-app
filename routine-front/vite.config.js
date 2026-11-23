import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_TARGET = process.env.ROUTINE_API_URL ?? "http://localhost:3334";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
