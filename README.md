# Welton

Корпоративный сайт строительной компании на [Astro](https://astro.build) —
главная-лонгрид, каталог из ~80 проектов с детальными страницами и правовыми
блоками. Статическая генерация, нулевой JS по умолчанию, аккуратный motion-слой
и единая дизайн-система. Контент вынесен из разметки — страницы собираются из
секций, тексты и пути к изображениям лежат в файлах данных и в Content
Collections.

**Прод:** https://welton.kz

---

## Стек

| Технология              | Назначение                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| **Astro 7**             | статическая генерация, островная архитектура, Content Collections |
| **Tailwind CSS 4**      | утилитарные стили + дизайн-токены через `@theme`                  |
| **TypeScript** (strict) | типобезопасность компонентов и данных                             |
| **GSAP + Lenis**        | плавный скролл и анимации (ScrollTrigger, SplitText)              |

Требуется **Node.js ≥ 22.12**.

## Быстрый старт

```bash
npm install      # установить зависимости
npm run dev      # дев-сервер на http://localhost:4321/
```

Прочие команды:

```bash
npm run build        # сборка в dist/
npm run preview      # локальный предпросмотр собранного сайта
npm run check        # типы (astro check)
npm run lint         # ESLint
npm run format:check # Prettier
```

## Структура

```text
src/
  pages/
    index.astro            главная — собирает секции в нужном порядке
    styleguide.astro       /styleguide — живая дизайн-система
    policy.astro           /policy — политика конфиденциальности
    agreement.astro        /agreement — пользовательское соглашение
    projects/
      index.astro          /projects/ — каталог с фильтрами
      [slug].astro         /projects/wlt-NN/ — детальная страница проекта
  layouts/
    Layout.astro           базовый HTML-каркас, <head>, подключение global.css
  components/
    layout/                Header, Footer
    sections/              секции главной (Hero, Stats, Services, …)
    project/               блоки детальной страницы проекта
    projects/              карточка, фильтры и сетка каталога
    ui/                    переиспользуемые примитивы (Icon, Hairline, SlideLink)
    Heading, Button, Container, Logo, GridLines, Motion, …   переиспользуемые блоки
  content.config.ts        Content Collection «projects» (loader из public/projects/)
  data/
    site.ts                сквозные данные: contact, nav
    home.ts                контент главной (stats, services, advantages, …)
    projectPage.ts         сквозные блоки детальной страницы проекта
    projectOverrides.ts    ручные надписи к проектам (title/tagline/…), маппинг по wlt-NN
  lib/
    asset.ts               asset() — единый способ строить пути к файлам из public/
  scripts/
    motion.ts              единая инициализация Lenis / GSAP / SplitText
  styles/
    global.css             дизайн-токены (@theme) + глобальные стили и сетка-направляющих
public/                    статические файлы: img/, video/, projects/, fonts/, favicon
```

## Документация

- [docs/architecture.md](docs/architecture.md) — как устроен сайт: страницы, секции, дизайн-токены, motion, сетка.
- [docs/content-editing.md](docs/content-editing.md) — **как менять тексты, картинки и добавлять секции и проекты.**
- [docs/deployment.md](docs/deployment.md) — как опубликовать обновление и про автодеплой.
- [AGENTS.md](AGENTS.md) — соглашения для разработчиков и AI-агентов.

## Деплой

Сайт хостится на **Cloudflare Workers** и привязан к домену https://welton.kz.
Cloudflare сам пересобирает и публикует сайт при каждом пуше в `main` — отдельных
шагов не требуется. CI-гейт качества (`check`, `lint`, `format`, защита от
хардкода `max-w-[1680px]`) гоняется в GitHub Actions на каждый push и PR.
Подробности — в [docs/deployment.md](docs/deployment.md).
