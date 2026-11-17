import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import pwa from "./pwa.mjs";

export default defineConfig({
  integrations: [react(), pwa()],
  vite: { plugins: [tailwindcss()] },
  devToolbar: {
    enabled: false,
  },
});