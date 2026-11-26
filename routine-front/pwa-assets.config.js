import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

// Icons of the installed app (PWA), made from public/logo.svg: `npm run pwa:icons`.
// favicon.ico and apple-touch-icon.png are hand-made and stay as they are.
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { ...minimal2023Preset.transparent, favicons: [] },
    apple: { ...minimal2023Preset.apple, sizes: [] },
  },
  images: ["public/logo.svg"],
});
