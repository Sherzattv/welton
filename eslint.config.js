import eslintPluginAstro from "eslint-plugin-astro";

export default [
  // Глобальные игноры
  {
    ignores: ["dist/", ".astro/", ".claude/", "node_modules/"],
  },
  // Рекомендованный набор правил для .astro
  ...eslintPluginAstro.configs.recommended,
];
