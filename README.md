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

## Проверка качества

Перед коммитом:

```bash
npm run build
```

Для визуальной работы основная проверка — глазами в браузере. Скрипт `npm run diff` оставлен как вспомогательный инструмент, но не является главным критерием совпадения.
