# Велес Групп — Astro rebuild

Чистый ребилд сайта `okna-veles-group.ru` после Tilda. Цель — визуально близко к оригиналу, но без Tilda-кода: масштабируемая Astro-архитектура, переиспользуемые секции, единые дизайн-токены и подготовка к дальнейшему развитию/CMS.

## Стек

- Astro 7
- Tailwind CSS 4
- TypeScript
- GSAP + Lenis для motion-слоя
- Playwright/pixelmatch/sharp для вспомогательной визуальной проверки

## Команды

```bash
npm install
npm run build
npm run preview
```

Dev-сервер запускать в background-режиме:

```bash
npx astro dev --background
npx astro dev status
npx astro dev stop
npx astro dev logs
```

Reference-копия Tilda:

```bash
npm run diff:serve
# original: http://localhost:8765/
# rebuild:  http://localhost:4321/
```

## Структура

```text
src/
  components/
    layout/       Header/Footer
    sections/     секции главной страницы
    Button.astro  фирменная CTA-кнопка
    GridLines.astro глобальные вертикальные направляющие
  data/home.ts    контент главной страницы
  layouts/        базовый HTML/layout
  scripts/        motion-инициализация
  styles/global.css дизайн-токены и глобальные CSS-переменные
```

## Важные решения

- Контент главной вынесен в `src/data/home.ts`.
- Вертикальные направляющие имеют один источник правды в `src/styles/global.css`: `--guide-a`, `--guide-b`, `--guide-c`. `GridLines` и sticky-шапка используют одни и те же координаты.
- Header повторяет Tilda-модель из двух шапок:
  - верхняя прозрачная шапка статично лежит в hero и уезжает вместе со страницей;
  - белая fixed-шапка создаётся как отдельный клон и появляется только при обратном скролле ниже порога.
- Hero откалиброван под ключевые размеры оригинала: desktop `1200/1440`, tablet `640`, mobile `360/390`.
- Кнопка использует фирменную структуру: текст слева, правый блок стрелки с вертикальным разделителем.

## Motion / анимации

Motion-слой максимально повторяет Tilda-reference, но без копирования Tilda-разметки:

- `src/scripts/motion.ts` — единая точка для Lenis, GSAP ScrollTrigger и SplitText.
- Lenis использует конфиг оригинала: `lerp: 0.1`, `wheelMultiplier: 0.95`, `touchMultiplier: 1.1`.
- Крупные заголовки и цифры статистики анимируются через SplitText: `duration: 1.2`, `stagger: 0.15`, `ease: power2.out`.
- `data-reveal` оставлен только для точечных Tilda SBS fade-in элементов: hero description/CTA и CTA note.
- Sticky header повторяет оригинальную схему: отдельная белая fixed-шапка появляется на обратном скролле, transition `500ms linear`.
- Hover ссылок `link-slide`: текст уезжает вверх, снизу приходит серая копия.
- Hover zoom изображений в карточках: `scale(1.04–1.05)` за `200ms ease-in-out`.
- Objects slider автолистается каждые `3000ms` и остаётся управляемым стрелками.
- Partners marquee бесконечно движется и ставится на паузу при hover.
- FAQ раскрывается по высоте `400ms ease-in-out`, один пункт открыт за раз.

При добавлении новых секций сначала переиспользуйте эти паттерны, а не создавайте локальные one-off анимации.

## Проверка качества

Перед коммитом:

```bash
npm run build
```

Для визуальной работы основная проверка — глазами в браузере. Скрипт `npm run diff` оставлен как вспомогательный инструмент, но не является главным критерием совпадения.
