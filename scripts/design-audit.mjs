#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const src = join(root, "src");

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else if (/\.(astro|ts|tsx|js|mjs|css)$/.test(entry)) out.push(path);
  }
  return out;
};

const files = walk(src);
const issues = [];

const add = (file, line, message) => {
  issues.push(`${relative(root, file)}:${line}: ${message}`);
};

for (const file of files) {
  const rel = relative(root, file);
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const n = index + 1;

    if (/max-w-\[1680px\]|max-width:\s*1680px/.test(line)) {
      add(
        file,
        n,
        "use var(--content-max) or <Container>, not hardcoded 1680px",
      );
    }

    if (/--s\s*:/.test(line) && rel !== "src/styles/global.css") {
      add(file, n, "--s must be declared only in src/styles/global.css");
    }

    if (/from ["']\.\.|import\(["']\.\./.test(line)) {
      add(file, n, "use path aliases instead of parent relative imports");
    }

    if (/#22866b|#1e785f/i.test(line)) {
      add(file, n, "old green accent found; use red accent tokens");
    }

    if (
      /["'`]\/(img|video|fonts|favicon)\//.test(line) &&
      !line.includes("asset(")
    ) {
      add(file, n, "wrap public asset paths with asset()");
    }

    if (
      /(objects-arrow|projects-arrow|projects2-arrow|custom-arrow|projects-grid-button|projects2-button)/.test(
        line,
      )
    ) {
      add(
        file,
        n,
        "deprecated one-off UI class; use shared Button/IconButton sizing",
      );
    }
  });
}

if (issues.length) {
  console.error("Design audit failed:\n" + issues.join("\n"));
  process.exit(1);
}

console.log("Design audit passed");
