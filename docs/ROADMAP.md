# Дорожная карта: подготовка к масштабированию

Документ фиксирует результат senior-аудита кодовой базы на масштабируемость,
переиспользуемость и готовность к росту (новые страницы, раздел проектов,
SEO-статьи).

Цель — чтобы новая страница или секция **собиралась из готовых кубиков**, а
отступы, сетка и типографика совпадали с остальным сайтом _by construction_, без
копипасты и подбора на глаз.

> Порядок важен: **Фаза 1 (фундамент) делается ДО добавления новых страниц.**
> Иначе технический долг множится с каждым новым экраном.

---

## Статус реализации

**Фаза 1 «безопасное ядро» — СДЕЛАНО и закоммичено** (ветка
`claude/sleepy-ardinghelli-aa893a`, 7 коммитов; в `main` ещё не смёржено).

Сделано: path-алиасы (#1); токен `--content-max` + греп-гейт (#2); токены ритма
`--section-py`/`--stack-gap` + оживлён `<Section>` (#3); `--s` поднят в `:root`
(#4.1); общие типы + `satisfies` + `data/site.ts` (#5); примитивы
`Icon`/`Hairline`/`SlideLink` (#6 частично); prettier + eslint + `astro check` +
CI-гейт `quality` (#7); синхронизированы доки. Попутно — 3 пред-существовавших
багфикса (были и в `main`): загрузка шрифта Adderley (404 → перенос в `src/assets`),
sticky-заголовки Stats/Stages (`body { overflow-x: clip }` вместо `hidden`),
воздух после Services (+3vw).

### Отложено из Фазы 1

Выбран «безопасный» объём — **не трогать пиксельно откалиброванные артборды**
(сняты 1:1 с Tilda). Всё ниже требует ручной браузер-выверки на 375/768/960/1280/1680
и **на добавление новых страниц НЕ влияет** (это внутренние чистки дублирования):

| #   | Что отложено                                                                                               | Почему                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 6   | `MediaFigure` — обёртка картинки + hover-zoom (дублируется в Services/Objects/ProjectCard, 200 vs 700ms)   | трогает геометрию обёрток картинок в артбордах                                         |
| 6   | `NumberedRow` — `num + title + desc + линия` (переписан 4–5 раз: Services/Stages/Objects/Stats/Advantages) | у каждого свой desktop-артборд с уникальными vw-координатами                           |
| 6   | `IconButton` — стрелки слайдера Objects + кнопка «наверх» Footer                                           | разный hover → объединение даст видимое изменение                                      |
| 4.2 | лестница spacing-токенов вместо сырых `calc(var(--s)*NN)`                                                  | сотни уникальных множителей; риск расклейки без выгоды                                 |
| 4.3 | унификация guide-полей (на 640–959 хардкод `24px` vs `--spacing-gutter ~19px`)                             | намеренная Tilda-калибровка планшета — менять = перепроверять все планшетные раскладки |
| 4   | `--s` с `100vw/360` → `100%/360` (чинит дёрганье при вертикальном скроллбаре)                              | меняет масштаб артбордов, нужна сверка                                                 |

### Впереди (отдельные фазы, НЕ часть Фазы 1)

- **Фаза 2** — Content Collections + динамические роуты `/projects` и `/articles`.
- **Фаза 3** — SEO-слой (canonical, Open Graph, JSON-LD, sitemap, robots).
- **Фаза 4** — `astro:assets` (оптимизация картинок) + доступность.
- **Инженерная строгость** — перф-бюджет (Core Web Vitals), a11y-гейт, кастомная
  404, link-check (см. раздел «Инженерная строгость» в конце).

Детали по всем пунктам — в разделах ниже.

---

## Вердикт

> _Разделы «Вердикт» и «Главные системные дефекты» ниже описывают состояние НА
> МОМЕНТ АУДИТА (до Фазы 1). Что из этого уже закрыто — см. «Статус реализации» выше._

Код чистый, компактный и местами сделан на senior-уровне, но архитектурно
спроектирован под **одну** страницу. Главный системный дефект — отсутствует
принудительный слой примитивов: ширина и боковые поля контента захардкожены в
9 файлах при том, что `Container.astro` уже умеет быть единственным источником
правды; `Section`/`ProjectCard` живут только в `styleguide.astro` и дрейфанули от
прода; вертикального ритма как токена не существует; мобильный скейл
`--s: calc(100vw/360)` переобъявлен в 8 файлах; нет path-алиасов, общих типов,
Content Collections, SEO-слоя и гейта качества в CI.

Зрелость: **хороший прототип лендинга**, но до масштабируемой контент-платформы
~2–3 недели фундаментной работы. Фундамент заложен правильно (Container уже умеет
нужное, токены есть, контент отделён), поэтому это «отполировать фундамент», а не
«переписать».

## Что уже сделано хорошо

- **Моушн-слой** — грамотно и доступно: `html.motion` ставится inline-скриптом
  только без `prefers-reduced-motion`, ранний `return` в `initMotion`, ожидание
  `document.fonts.ready` перед SplitText, `CustomCursor` гаснет на touch/reduce.
- **Дизайн-токены** централизованы в `@theme` (`global.css`): один акцент,
  типошкала с per-size трекингом, замеренный `--spacing-gutter`, брейкпоинты.
- **`Container.astro` уже спроектирован правильно** — принимает `as` и `class`,
  поэтому миграция 9 захардкоженных контейнеров на него дешёвая.
- **Контент отделён** от разметки (`src/data/home.ts`, типизированный экспорт).
- **`asset()`** аккуратно решает base-путь `/welton/` в одном месте.
- **strict TS**, `lang="ru"`, `loading=lazy` / `decoding=async`,
  `fetchpriority=high` на hero — базовая гигиена a11y/perf присутствует.

## Главные системные дефекты

| Проблема                | Факт                                                                                  | Чем вредит                                                                |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Контейнер в 9 местах    | `mx-auto w-full max-w-[1680px] px-gutter` в 8 секциях + `Footer` вместо `<Container>` | 9 источников правды для ширины/полей — корень проблемы с отступами        |
| Мёртвые абстракции      | `Section` и `ProjectCard` используются только в `styleguide.astro`                    | прод их игнорирует; раздел «проекты» = `ProjectCard`, но он небоеспособен |
| Нет ритма как токена    | 7 секций → 7 разных систем `py`                                                       | новая секция получает отступы «на глаз»                                   |
| `--s` в 8 файлах        | сотни магических `calc(var(--s)*NN)`                                                  | скейл-стратегия размазана копипастой                                      |
| Нет Content Collections | весь контент в `home.ts`                                                              | на блог/проекты не масштабируется                                         |
| Нет SEO-слоя            | `Layout` отдаёт только `title`/`description`                                          | ни canonical, ни OG, ни JSON-LD, ни sitemap, ни robots                    |
| Нет path-алиасов        | 64 импорта вида `../../`                                                              | на вложенных страницах разрастётся в `../../../`                          |

---

## Фаза 1 — Фундамент

> Делать ДО любых новых страниц. **Статус по пунктам — в «Статус реализации» выше:**
> #1, #2, #3, #5, #7 — сделано; #4 и #6 — частично (часть отложена).

### 1. Path-алиасы в `tsconfig` · impact: high · effort: S

Добавить `baseUrl: "."` и `compilerOptions.paths`: `@/*`→`src/*`, плюс
`@components`, `@data`, `@lib`, `@layouts`, `@styles`, `@content`, `@config`.
Astro/Vite читают `paths` из `tsconfig` автоматически. Поиск-замена по 64 импортам
`../`/`../../`. **Делать первым** — разблокирует остальное.
Файлы: `tsconfig.json`; затем все `.astro` в `src/`.

### 2. `<Container/>` — единственный владелец ширины и полей · impact: critical · effort: M · deps: 1

Завести токен `--content-max: 1680px` в `@theme` (сейчас — литерал в JSX).
`Container.astro` → `max-w-[var(--content-max)]`. Заменить inline-строку
`mx-auto w-full max-w-[1680px] px-gutter` во всех 8 секциях + `Footer` на
`<Container class="...-inner relative z-10">`. Добавить вариант `width="prose"`
(~70ch) для текстовых страниц блога. Защитить grep-проверкой в CI.
Файлы: `Container.astro`, `global.css`; `sections/{Objects,Services,Stages,Faq,Partners,Advantages,CtaCalc}.astro`, `layout/Footer.astro`.

### 3. Токены вертикального ритма + оживить `<Section/>` · impact: high · effort: M · deps: 2

Ввести `--section-py: clamp(64px,6vw,120px)` (+ `sm`/`lg`) и `--stack-gap`.
`Section.astro`: `padding-block` через токен вместо `py-16 sm:py-24 lg:py-32`,
пропсы `tone`/`density`/`width`/`contained`, внутри `Container`. Сделать его
каноном для нового flow-контента (проекты/блог) и секций с простым ритмом
(`Faq`, `Partners`). Absolute-артборд-секции главной обернуть в `Container`.
Файлы: `Section.astro`, `global.css`.

### 4. Централизовать мобильный скейл `--s` и брейкпоинты · impact: medium · effort: L · deps: 2

Поднять `--s: calc(100% / 360)` (от контейнера, не `100vw` — `100vw` ломается при
вертикальном скроллбаре) в один источник (`@utility art-scale` или `:root`).
Убрать переобъявление `--s` из 8 файлов. Сырые `calc(var(--s)*NN)` заменить на
ограниченную лестницу токенов. Согласовать `guide-*` поля с `--spacing-gutter`
(на 640–959 сейчас хардкод `24px` расходится с `clamp ~19px`).
Файлы: `global.css`; `<style>` в 8 секциях + `Footer`.

### 5. Общие типы данных + `satisfies` · impact: high · effort: M · deps: 1

`src/types.ts` с `interface` для каждой сущности (`Service`, `ProjectObject`,
`Stage`, `Faq`, `Stat`, `Advantage`). В `home.ts` применить через
`export const services = [...] satisfies Service[]` — ловит опечатки на сборке.
Эти же типы — основа Zod-схем коллекций (шаг 9). Вынести `contact` и `nav` в
`src/data/site.ts` (сквозные данные `Header`/`Footer`, не контент главной).
Файлы: `src/types.ts` (новый), `home.ts`, `src/data/site.ts` (новый), `Header.astro`, `Footer.astro`.

### 6. Слой примитивов · impact: high · effort: L · deps: 2, 5

- `Icon.astro` с реестром path (`arrow-right`/`arrow-left`/`chevron`/`arrow-up`) —
  заменить 7+ inline-SVG (`Button`, `ProjectCard`, `Objects`, `Header`, `Faq`, `Footer`).
- `Card` + `MediaFigure` (overflow/radius/hover-zoom — сейчас дублируется в
  `Services`/`Objects`/`ProjectCard` с разъехавшимися таймингами).
- `NumberedRow` (num + title + desc + волосяная линия) — один смысловой блок,
  переписанный 4–5 раз (`Services`/`Stages`/`Objects`/`Stats`/`Advantages`).
- `Hairline`-утилита вместо 4 копий `1px currentColor`.
- `SlideLink` / `IconButton` — hover-паттерны, скопированные между `Header` и `Footer`/`Objects`.
  Файлы: `src/components/ui/{Icon,Card,MediaFigure,NumberedRow,SlideLink,IconButton}.astro` (новые); рефактор перечисленных секций.

### 7. Линт / форматтер / typecheck + CI-гейт · impact: high · effort: M · deps: 1

devDeps: `@astrojs/check` + `typescript`, `prettier` + `prettier-plugin-astro` +
`prettier-plugin-tailwindcss` (автосортировка классов критична против дрейфа),
`eslint` + `eslint-plugin-astro`. Scripts: `check`, `lint`, `format`,
`format:check`. В CI: job `quality` (`check && lint && format:check`) →
`build needs: quality`. Grep-проверки: запрет `max-w-[1680px]` вне `Container` и
сырых px-полей.
Файлы: `package.json`, `.prettierrc`, `eslint.config.js`, `.github/workflows/deploy.yml`.

## Фаза 2 — Масштаб контента

### 8. Свести карточку к одному источнику · impact: high · effort: M · deps: 6

Заточить `ProjectCard` под коллекцию (принимает `ImageMetadata`, `id`→`href`,
варианты `layout=overlay|stacked`). Перевести каталог объектов главной
(`.object-card` в `Objects.astro`) на общий `Card`/`MediaFigure`, удалить
дублирующую вёрстку. Секции читают данные через props со значениями по
умолчанию (`interface Props { items?: ... }`) — чтобы переиспользовать на других
страницах без правки `home.ts`.
Файлы: `ProjectCard.astro`, `sections/{Objects,Services,Faq}.astro`.

### 9. Content Collections: `projects` + `articles` · impact: critical · effort: L · deps: 5

`npx astro add mdx`. `src/content.config.ts` (Astro 7 — не legacy
`src/content/config.ts`) с `defineCollection({ loader: glob({...}), schema })`.

- `projects`: `title`, `location`, `year`, `category` (enum), `cover image()`, `gallery`, `draft`.
- `articles`: `title`, `description`, `ogImage image().optional()`,
  `publishDate z.coerce.date()`, `updatedDate`, `tags`, `draft`, `author`.

Схему держать в синхроне с типами из шага 5. Обложки — в `src/content/.../cover.jpg`
через `astro:assets` (srcset/AVIF/WebP, исключают CLS). Site-singletons
(`contact`/`nav`/`partners`) оставить typed TS.
Файлы: `src/content.config.ts` (новый), `src/content/{projects,articles}/*`, `package.json`, `astro.config.mjs`.

### 10. Динамические роуты · impact: critical · effort: M · deps: 9, 8

`/projects` (`index.astro` с `getCollection`, фильтр `draft` через
`import.meta.env.PROD`, сетка из `ProjectCard`), `/projects/[id]`
(`getStaticPaths` + `const { Content } = await render(entry)`). Аналогично
`/articles` (сортировка по `publishDate` desc). Ссылки — через
`import.meta.env.BASE_URL`/`asset()`, не хардкодить `/welton/`.
Файлы: `src/pages/projects/{index,[id]}.astro`, `src/pages/articles/{index,[id]}.astro` (новые).

### 11. `<Prose>` + `ArticleLayout` · impact: high · effort: M · deps: 3, 10

`Prose.astro` со стилями `p`/`h2`/`h3`/`ul`/`a`/`blockquote` на токенах
типографики, ширина из `--measure` (~70ch). `ArticleLayout` = `Section width=prose`

- `Prose` + meta (дата/теги/хлебные крошки). Статья = frontmatter + markdown без
  копипасты вёрстки. `Faq.astro` перевести на тот же `--measure`-токен.
  Файлы: `Prose.astro`, `ArticleLayout.astro` (новые), `sections/Faq.astro`.

## Фаза 3 — SEO-инфраструктура

### 12. `site config` + компонент `<Seo/>` в Layout · impact: high · effort: M · deps: 1, 5

`src/config/site.ts`: `url`, `base`, `brand`, `defaultTitle/Description`,
`defaultOgImage`, `locale "ru-RU"`, `org` (из `contact`). `src/lib/seo.ts`:
`absoluteUrl(path) = new URL(asset(path), Astro.site).href` (**важно**: `Astro.site`
не содержит `/welton` — сначала `asset()` для base, потом домен, иначе canonical/og
битые). `Seo.astro` с props `{ title?, description?, canonical?, ogImage?, ogType?,
noindex?, jsonld? }`: meta description, canonical, OG, Twitter `summary_large_image`,
robots, JSON-LD через `set:html`. `titleTemplate "{title} — {brand}"`.
Файлы: `src/config/site.ts`, `src/lib/seo.ts`, `Seo.astro` (новые), `Layout.astro`.

### 13. JSON-LD + дефолтный OG-баннер · impact: high · effort: M · deps: 12

На главной — `Organization`/`LocalBusiness` из `contact` (name, telephone, email,
address, `taxID=inn`, `sameAs=[telegram, max]`). Фабрики `buildArticleSchema` и
`buildBreadcrumbs` в `seo.ts`. `public/img/og-default.jpg` (1200×630) как fallback
(`favicon.svg` как og:image не годится).
Файлы: `seo.ts`, `index.astro`, `ArticleLayout.astro`, `public/img/og-default.jpg` (новый).

### 14. `@astrojs/sitemap` + `robots.txt` · impact: high · effort: S · deps: 12

`npx astro add sitemap` (`site` задан → URL под `/welton/` корректны),
`filter` исключает `/styleguide`. `public/robots.txt` с абсолютным `Sitemap:`.
`noindex` для `styleguide.astro`. После сборки грепнуть `dist/` на корректность
canonical/og:image (base + домен).
Файлы: `astro.config.mjs`, `public/robots.txt` (новый), `styleguide.astro`, `package.json`.

## Фаза 4 — Полировка

### 15. Миграция изображений на `astro:assets` · impact: medium · effort: L · deps: 6

Обёртка `Img.astro` поверх `<Image>`. Перевести контентные картинки
(`Objects`/`Services`/`CtaCalc`/`Partners`/`ProjectCard`) — даёт `width/height`
(убирает CLS), AVIF/WebP, responsive srcset. Hero-LCP: `<Image loading=eager
fetchpriority=high>` + `width/height`. Логотипы партнёров можно оставить в
`public/` через `asset()`.
Файлы: `Img.astro` (новый), `src/assets/*`, `sections/{Hero,Objects,Services,CtaCalc,Partners}.astro`, `ProjectCard.astro`.

### 16. A11y: focus-visible, skip-link, доступная карусель · impact: medium · effort: M · deps: 6

Глобальный `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`

- явный focus-ring у `Button`. Skip-link (`a href="#main"`, `.sr-only`) первым в
  body. Карусель `Objects`: `role="group"` + `aria-roledescription` + `aria-label`,
  `aria-live="polite"`, управление стрелками клавиатуры; авто-прокрутка
  (`setInterval 3000`) — `clearInterval` на `pointerenter`/`focusin`, пауза по
  `IntersectionObserver` и `document.hidden` (WCAG 2.2.2).
  Файлы: `global.css`, `Button.astro`, `Layout.astro`, `sections/Objects.astro`.

### 17. Шрифт Adderley → woff2 + preload · impact: low · effort: S

Конвертировать `adderley-bold.woff` в woff2 (~25% легче), поставить первым в `src`
(`woff` фолбэком). `<link rel="preload" as="font" type="font/woff2" crossorigin>`
в head — шрифт критичен для LCP hero-заголовка и сейчас даёт FOUT + задерживает
SplitText (`motion.ts` ждёт `fonts.ready`).
Файлы: `public/fonts/adderley-bold.woff2` (новый), `global.css`, `Layout.astro`.

### 18. Чек-лист новой страницы в styleguide + docs · impact: medium · effort: S · deps: 2, 3, 6, 7

Обновить `styleguide.astro`, чтобы отражал РЕАЛЬНЫЙ прод-канон
(`Container`/`Section`/примитивы), а не дрейфанувшие демо. Дополнить
`docs/architecture.md`: контракт `ui/` vs `sections/` vs `layout/`, правила
раскладки, паттерн `--s`. Привязать к CI-grep-проверкам из шага 7.
Файлы: `styleguide.astro`, `docs/architecture.md`, `README.md`.

---

## Инженерная строгость (senior / Google-grade)

Кросс-секущие практики, поднимающие проект до senior/Google-уровня именно для
**контент-сайта** (не enterprise-приложения). Частично пересекаются с Фазами 3–4,
но зафиксированы здесь как стандарт. Принцип — _right-sizing_: только то, что даёт
ценность статике, без оверинжиниринга.

### R1. Перф-бюджет (Core Web Vitals) · impact: high · effort: M

Google ранжирует по LCP / CLS / INP. Сейчас риск CLS (сырые `<img>` без размеров),
нет оптимизации изображений и бюджета в CI.

- картинки → `astro:assets` (`<Image>`: width/height, AVIF/WebP, srcset) — см. #15;
- preload hero-LCP (изображение + шрифт Adderley woff2) — см. #17;
- Lighthouse CI (`@lhci/cli`) с бюджетом (LCP < 2.5s, CLS < 0.1) — предупреждающий
  job в `deploy.yml` рядом с `quality`.

### R2. A11y-гейт · impact: high · effort: M

Доступность = UX + SEO + юридические требования.

- статический линт `eslint-plugin-jsx-a11y` (через `eslint-plugin-astro`) или
  `axe`-проверка собранного `dist/` в CI;
- руками закрыть #16 (focus-visible, skip-link, доступная карусель, `aria-*`);
- `prefers-reduced-motion` уже учтён — держать.

### R3. Кастомная 404 · impact: medium · effort: S

`src/pages/404.astro` на `Layout` + `Section` со ссылкой на главную (сейчас отдаётся
дефолт хоста). GitHub Pages подхватывает статический `404.html` автоматически.

### R4. Link-check · impact: medium · effort: S

Проверка битых внутренних ссылок и ассетов по собранному `dist/` (напр. `linkinator`
или `lychee`) — предупреждающий job в CI. Дёшево, ловит мёртвые `href` / `asset()`.

### Что НАМЕРЕННО не делаем (снизило бы senior-грейд для статики)

- юнит/e2e-тесты на presentational-вёрстку (вместо них — build + a11y + link-check);
- сложный state-менеджмент или рантайм-фреймворк на клиенте;
- избыточный CI/CD, микро-фронтенды.

---

## Воркфлоу новой страницы (после Фазы 1)

1. **Контент сначала, не разметка.** Лендинг → typed-данные в `src/data/` через
   `satisfies`. Проект/статья → markdown/mdx в `src/content/{projects,articles}/`
   с frontmatter, который Zod-схема валидирует на сборке.
2. **Роут в `src/pages/`.** Список — `index.astro` с `getCollection()` и фильтром
   `draft`. Деталь — `[id].astro` с `getStaticPaths` + `render(entry)`.
3. **Оборачивай в примитивы раскладки, не в ручные `div`.** Корень страницы —
   `<Section tone density width>` (даёт вертикальный ритм через `--section-py` и
   поля через `<Container>`). Ширину/поля руками в px **не писать**.
4. **Длинный текст** — `<Section width="prose">` + `<Prose>` (~70ch, типографика
   из токенов автоматически).
5. **UI из примитивов:** карточки — `<Card>`/`<ProjectCard>`, картинки —
   `<Img>`/`<MediaFigure>`, иконки — `<Icon>`, ряды — `<NumberedRow>`, ссылки —
   `<SlideLink>`/`<IconButton>`. Никаких inline-SVG и копипасты блоков.
6. **Импорты — только через алиасы** (`@components`, `@data`, `@lib`, `@content`).
7. **SEO декларативно:** страница передаёт `title`/`description`/`ogImage`/`jsonld`
   в `<Seo/>`. `titleTemplate`, canonical/OG/Twitter/sitemap — автоматически с
   учётом base `/welton/` через `absoluteUrl()`.
8. **Перед коммитом** — `npm run check && lint && format:check`. Отступы и стиль
   совпадут с остальным сайтом _by construction_, а CI-grep заблокирует
   захардкоженный контейнер и сырые px-поля.
