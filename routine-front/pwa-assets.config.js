import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Every icon made from public/logo.svg (the nuCorre sticker on a navy square): `npm run pwa:icons`.
// Out come pwa-64/192/512, maskable-icon-512x512, favicon.ico and apple-touch-icon-180x180.png.
export default defineConfig({
  preset: minimal2023Preset,
  images: ["public/logo.svg"],
});
