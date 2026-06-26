// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Публикация на собственном домене (Cloudflare Workers): https://welton.kz
  // Сайт обслуживается из корня домена, поэтому base не задаём.
  site: "https://welton.kz",
  vite: {
    plugins: [tailwindcss()],
  },
});
