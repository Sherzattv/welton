## Project notes

This is a clean Astro rebuild of a Tilda reference site. Keep implementation scalable: reusable Astro components, content in `src/data/home.ts`, no copied Tilda classes/markup.

Important visual conventions:

- Global vertical guide positions live in `src/styles/global.css` as `--guide-a`, `--guide-b`, `--guide-c`; use them everywhere lines must align.
- Header behavior mirrors Tilda with two headers: static transparent hero header + separate white fixed header shown on reverse scroll.
- Hero typography/spacing is calibrated for 1440, 1200, 640, 390, and 360 widths; verify these breakpoints when changing hero/header.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
