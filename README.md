# Welton

Корпоративный сайт-одностраничник строительной компании на [Astro](https://astro.build).
Статическая генерация, нулевой JS по умолчанию, аккуратный motion-слой и единая
дизайн-система. Контент вынесен из разметки — страница собирается из секций,
а тексты и изображения лежат в одном файле данных.

> Текущее наполнение — компания «Велес Групп» (остекление объектов). Это базовая
> версия: контент, бренд и набор секций предполагается менять и расширять.

**Прод:** https://welton.kz

---

## Стек

| Технология              | Назначение                                           |
| ----------------------- | ---------------------------------------------------- |
| **Astro 7**             | статическая генерация страниц, островная архитектура |
| **Tailwind CSS 4**      | утилитарные стили + дизайн-токены через `@theme`     |
| **TypeScript** (strict) | типобезопасность компонентов и данных                |
| **GSAP + Lenis**        | плавный скролл и анимации (ScrollTrigger, SplitText) |

Требуется **Node.js ≥ 22.12**.

## Быстрый старт

```bash
npm install      # установить зависимости
npm run dev      # дев-сервер на http://localhost:4321/
```

Прочие команды:

```bash
npm run build    # сборка в dist/
npm run preview  # локальный предпросмотр собранного сайта
```

## Структура

```text
src/
  pages/
    index.astro        главная — собирает секции в нужном порядке
    styleguide.astro   /styleguide — живая дизайн-система (цвета, типографика, компоненты)
  layouts/
    Layout.astro       базовый HTML-каркас, <head>, подключение global.css
  components/
    layout/            Header, Footer
    sections/          секции главной (Hero, Stats, Services, …)
    Heading, Button, Container, Logo, GridLines, Motion, …   переиспользуемые блоки
  data/
    home.ts            ВЕСЬ контент главной страницы (тексты, изображения, контакты)
  lib/
    asset.ts           asset() — префикс путей к файлам из public/ под base-путь
  scripts/
    motion.ts          единая инициализация Lenis / GSAP / SplitText
  styles/
    global.css         дизайн-токены (@theme) + глобальные стили и сетка-направляющих
public/                статические файлы: img/, video/, fonts/, favicon
```

## Документация

- [docs/architecture.md](docs/architecture.md) — как устроен сайт: секции, дизайн-токены, motion, сетка.
- [docs/content-editing.md](docs/content-editing.md) — **как менять тексты, картинки и добавлять секции.**
- [docs/deployment.md](docs/deployment.md) — как опубликовать обновление и про автодеплой.
- [AGENTS.md](AGENTS.md) — соглашения для разработчиков и AI-агентов.

## Деплой

Сайт хостится на **Cloudflare Workers** и привязан к домену https://welton.kz.
Cloudflare сам пересобирает и публикует сайт при каждом пуше в `main` — отдельных
шагов не требуется. Подробности — в [docs/deployment.md](docs/deployment.md).
