# Деплой

Сайт хостится на **Cloudflare Workers** (раздача статических ассетов) и привязан к
домену **welton.kz**. Сборку и публикацию Cloudflare запускает сам при каждом
пуше в `main` — ручных шагов нет.

## Как это работает

1. Пуш в ветку `main` на GitHub.
2. Cloudflare Workers Builds подхватывает изменения и выполняет две команды:
   - **Build:** `npm run build` → готовый статический сайт в `dist/`;
   - **Deploy:** `npx wrangler deploy` → раскладывает `dist/` по сети Cloudflare.
3. Через ~1–2 минуты обновление уже на проде. Это и есть «push → само
   обновилось».

## Конфигурация деплоя — `wrangler.jsonc`

Файл [`wrangler.jsonc`](../wrangler.jsonc) в корне репозитория говорит Cloudflare,
что мы отдаём готовую статику из папки `dist/`:

```jsonc
{
  "name": "welton",
  "compatibility_date": "2026-06-26",
  "assets": {
    "directory": "./dist",
  },
}
```

`assets.directory` указывает на каталог, куда собирает Astro. Никакого сервера,
базы данных или серверного кода — только готовые файлы.

## Конфигурация сайта — `astro.config.mjs`

- `site: "https://welton.kz"` — для корректных канонических URL и карты сайта.
- **`base` не задан** — сайт обслуживается из корня домена (`welton.kz/...`).

> При прежнем хостинге на GitHub Pages стоял `base: "/welton"`, потому что сайт
> жил под под-путём `/welton/`. Для собственного домена это не нужно и сломало бы
> ссылки на стили и картинки — поэтому `base` убран.

## Домен и SSL

Домен `welton.kz` подключается к проекту в Cloudflare. Для этого нейм-серверы
домена переводятся с ps.kz на Cloudflare (Cloudflare подсказывает, какие именно).
После этого:

- `welton.kz` начинает указывать на наш Worker;
- **SSL-сертификат выпускается и продлевается автоматически** — отдельно покупать
  не нужно. Это закрывает требование зоны .kz по обязательному SSL.

## CI-гейт качества

Параллельно с деплоем работает GitHub Actions workflow
[`.github/workflows/quality.yml`](../.github/workflows/quality.yml) — он
запускается на каждый push в `main` и на каждый PR, и гоняет те же проверки,
что и локально:

- `npm run check` — типы (`astro check`);
- `npm run lint` — ESLint;
- `npm run format:check` — Prettier;
- guard на хардкод `max-w-[1680px]` (вместо токена `--content-max`).

Сборку и публикацию делает Cloudflare Workers Builds — этот workflow ничего
не деплоит, только сигнализирует о регрессиях.

## Локальная проверка перед пушем

Перед тем как пушить в `main`, прогоните те же проверки локально:

```bash
npm run check && npm run lint && npm run format:check
npm run build
```

Визуальную часть проверяйте глазами в браузере (`npm run dev`).
