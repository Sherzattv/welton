// @ts-check
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // Публикация на GitHub Pages: репозиторий Sherzattv/welton →
  // сайт доступен по https://sherzattv.github.io/welton/
  site: "https://sherzattv.github.io",
  base: "/welton",
  vite: {
    plugins: [tailwindcss()],
  },
});
