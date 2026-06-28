# Архитектура

Документ описывает, как устроен сайт изнутри: из чего собирается страница,
где живут стили и анимации, и каким правилам следовать при расширении.

## Принципы

1. **Контент отделён от разметки.** Тексты и пути к изображениям лежат в
   [`src/data/`](../src/data) и в Content Collection
   [`projects`](../src/content.config.ts). Секции только отображают эти данные.
2. **Переиспользуемые компоненты, без копипасты.** Заголовки, кнопки, контейнер,
   сетка-направляющих — общие компоненты. Новые секции собираются из них.
3. **Единый источник правды для дизайна.** Цвета, типографика, отступы и
   брейкпоинты заданы токенами в [`src/styles/global.css`](../src/styles/global.css).
4. **Минимум JS.** Astro отдаёт статический HTML. Клиентский JS — только motion-слой.

## Страницы

| Маршрут             | Файл                              | Что это                                                       |
| ------------------- | --------------------------------- | ------------------------------------------------------------- |
| `/`                 | `src/pages/index.astro`           | главная-лонгрид (секции из `src/data/home.ts`)                |
| `/projects/`        | `src/pages/projects/index.astro`  | каталог с фильтрами поверх коллекции `projects`               |
| `/projects/wlt-NN/` | `src/pages/projects/[slug].astro` | детальная страница проекта (сквозные блоки + данные `wlt-NN`) |
| `/policy`           | `src/pages/policy.astro`          | политика конфиденциальности                                   |
| `/agreement`        | `src/pages/agreement.astro`       | пользовательское соглашение                                   |
| `/styleguide`       | `src/pages/styleguide.astro`      | живая дизайн-система                                          |

## Сборка главной

Главная — это [`src/pages/index.astro`](../src/pages/index.astro). Она импортирует
секции и выстраивает их в порядке отображения:

```
Layout
 └─ Motion            прогресс-бар + инициализация анимаций
 └─ Header
 └─ main
     ├─ Hero          первый экран
     ├─ Stats         счётчики
     ├─ Services      направления (карточки)
     ├─ Advantages    преимущества (видео-фон)
     ├─ Objects       объекты (слайдер)
     ├─ Partners      партнёры (бегущая строка)
     ├─ Stages        этапы работы
     ├─ CtaCalc       блок заявки
     └─ Faq           вопросы-ответы
 └─ Footer
```

Каждая секция лежит в [`src/components/sections/`](../src/components/sections) и
самодостаточна: разметка + scoped-стили + чтение своих данных из `home.ts`.

## Каталог проектов

Каталог построен на Astro **Content Collections**. Коллекция `projects` описана
в [`src/content.config.ts`](../src/content.config.ts): кастомный loader сканирует
`public/projects/NN/` на каждом билде, читает `project.json` (геометрия, этажи,
площадь), подтягивает доступные изображения (`facade.png`, `3d-*.jpg`, `plan*.png`)
и мерджит сверху ручные надписи из
[`src/data/projectOverrides.ts`](../src/data/projectOverrides.ts) — `title`,
`tagline`, категория, технология, спальни и т. д. Сквозные блоки детальной
страницы («Полный цикл работ», «Дополнения в проект») берутся из
[`src/data/projectPage.ts`](../src/data/projectPage.ts) — один источник правды
на все ~80 проектов.

Карточка каталога и сетка живут в
[`src/components/projects/`](../src/components/projects), блоки детальной
страницы — в [`src/components/project/`](../src/components/project).

## Базовые компоненты

| Компонент         | Назначение                                                        | Ключевые пропсы                          |
| ----------------- | ----------------------------------------------------------------- | ---------------------------------------- |
| `Layout.astro`    | HTML-каркас, `<head>`, мета, подключение `global.css`             | `title`, `description`                   |
| `Container.astro` | контейнер — единый владелец макс-ширины (`--content-max`) и полей | `as`, `class`, `width` (default/prose)   |
| `Heading.astro`   | дисплейный заголовок (шрифт Adderley)                             | `as` (h1–h4), `size` (hero/xl/lg/md/sm)  |
| `Button.astro`    | фирменная кнопка со стрелкой                                      | `href`, `variant` (light/accent/outline) |
| `Logo.astro`      | инлайн-SVG логотипа                                               | `class`                                  |
| `GridLines.astro` | вертикальные направляющие секции                                  | —                                        |
| `Motion.astro`    | прогресс-бар скролла + запуск анимаций                            | —                                        |

`Section.astro` — секция flow-контента: вертикальный ритм из токенов
(`--section-py`) + тон фона + `Container` внутри. Это канон для flow-страниц
(каталог, правовые, детальные страницы проекта). Карточка проекта —
[`src/components/ProjectCard.astro`](../src/components/ProjectCard.astro):
используется и в каталоге, и на `/styleguide`. Узкоспециальные блоки лежат
в [`src/components/projects/`](../src/components/projects) (фильтры каталога)
и [`src/components/project/`](../src/components/project) (блоки детальной).

### Переиспользуемые примитивы (`src/components/ui/`)

| Примитив          | Назначение                                                       |
| ----------------- | ---------------------------------------------------------------- |
| `Icon.astro`      | реестр линейных иконок (`arrow-right/-left/-up`, `chevron-down`) |
| `Hairline.astro`  | волосяная линия-разделитель (1px `currentColor`)                 |
| `SlideLink.astro` | ссылка с hover «текст уезжает вверх» (Header/Footer)             |

Новые UI-элементы добавляйте сюда, а не инлайнить SVG и не повторять разметку.

### Раскладка: контейнер и full-bleed

Ширина контента и боковые поля берутся из токенов `--content-max` (1680px) и
`--spacing-gutter`. Менять число — только в `global.css`. Хардкод `max-w-[1680px]`
запрещён (CI-гейт): используйте `<Container>` (новые flow-страницы) либо
`max-w-[var(--content-max)] px-gutter` (артборд-секции главной, где геометрия
живёт в scoped-стилях секции и должна оставаться в её разметке).
`Stats` и `Hero` — намеренно full-bleed (позиционируются от краёв вьюпорта),
поэтому не оборачиваются в контейнер с макс-шириной.

## Дизайн-токены

Заданы в `global.css` внутри `@theme` и доступны как Tailwind-утилиты и
CSS-переменные. Менять оформление нужно здесь, а не в отдельных секциях.

- **Цвета:** `charcoal`, `ink`, `paper`, шкала `grey-200…500`, единственный
  акцент `accent` (зелёный) и `accent-hover`. → `bg-accent`, `text-paper`, …
- **Шрифты:** `--font-display` (Adderley, заголовки) и `--font-sans` (Inter, текст).
- **Типошкала:** `text-hero`, `text-h1…h4`, `text-stat`, `text-body` — размеры
  плавающие (`clamp`), растут с шириной окна, как в исходном дизайне.
- **Раскладка:** `--content-max` (макс-ширина контента, 1680px), `--content-prose`
  (узкая колонка ~70ch для текста), `--spacing-gutter` (боковые поля, `px-gutter`).
- **Вертикальный ритм:** `--section-py` / `-sm` / `-lg`, `--stack-gap` — для
  `<Section>` (flow-контент новых страниц).
- **Артборд-скейл:** `--s` — множитель `calc(var(--s) * N)` в секциях (Tilda-артборд
  360px на мобиле, `1px` на ≥640px). Объявлен ОДИН раз в `:root`; не дублируйте по секциям.
- **Брейкпоинты:** `xs 480 / sm 640 / md 960 / lg 1200 / xl 1440`.

## Вертикальные направляющие (сетка)

Декоративные вертикальные линии проходят через все секции в единых координатах.
Источник правды — переменные `--guide-a`, `--guide-b`, `--guide-c` в `global.css`.
`GridLines` и sticky-шапка используют одни и те же значения, поэтому линии
выровнены по всему сайту. При добавлении секции просто вставьте `<GridLines />`.

## Motion-слой

Вся логика движения собрана в [`src/scripts/motion.ts`](../src/scripts/motion.ts)
и запускается один раз из `Motion.astro`. Это:

- **Lenis** — плавный скролл (`lerp: 0.1`).
- **GSAP ScrollTrigger** — точечные fade-in по атрибуту `data-reveal`.
- **SplitText** — крупные заголовки и цифры статистики выезжают построчно.
- Sticky-шапка (отдельная белая шапка на обратном скролле), hover-эффекты
  ссылок и карточек, автослайдер объектов, бегущая строка партнёров, аккордеон FAQ.

При добавлении новых секций **переиспользуйте эти паттерны** (`data-reveal`,
`data-split`), а не пишите одноразовые анимации.

Анимации уважают `prefers-reduced-motion`: при включённой настройке весь контент
остаётся видимым и статичным.

## Пути к статике

Сайт обслуживается из корня домена (`welton.kz/...`), `base` в
[`astro.config.mjs`](../astro.config.mjs) не задан. Тем не менее ссылки на файлы
из `public/` пишите через хелпер [`asset()`](../src/lib/asset.ts):

```astro
---
import { asset } from "@lib/asset";
---

<img src={asset("/img/hero.jpg")} alt="…" />
```

`asset()` подставляет `import.meta.env.BASE_URL` — это единый шов, который
переживёт смену `base` и не даст «голым» `/img/...` разойтись по проекту.
Тот же хелпер применяется к данным из `home.ts` в местах рендера (см. `Services`,
`Objects`, `Partners`).

Изображения проектов из `public/projects/NN/` подключаются через тот же
`asset()` либо через `astro:assets`-обёртки в блоках детальной страницы.

## TypeScript и импорты

Проект на строгом пресете (`astro/tsconfigs/strict`). Доменные данные
типизированы интерфейсами в [`src/types.ts`](../src/types.ts) и проверяются
через `satisfies` в data-файлах: [`home.ts`](../src/data/home.ts) — контент
главной; [`site.ts`](../src/data/site.ts) — сквозные `contact`/`nav`
(их потребляют `Header`, `Footer`, `CtaCalc`);
[`projectPage.ts`](../src/data/projectPage.ts) — сквозные блоки детальной
страницы проекта;
[`projectOverrides.ts`](../src/data/projectOverrides.ts) — ручные надписи к
конкретным проектам. Коллекция `projects` валидируется Zod-схемой в
[`src/content.config.ts`](../src/content.config.ts). Опечатка в данных
ловится на сборке.

Импорты — через path-алиасы (`@components`, `@layout`, `@ui`, `@sections`,
`@layouts`, `@data`, `@lib`, `@styles`, `@/…`), а не относительные `../../`.

Перед коммитом: `npm run check && npm run lint && npm run format:check`. Те же
проверки гоняет CI-гейт `quality` на каждый push и PR в `main` (см.
[deployment.md](deployment.md)).
