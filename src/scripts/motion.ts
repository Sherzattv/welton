// ============================================================
// Моушн-слой сайта. Один источник правды для всего движения:
//   • Lenis — плавный скролл (конфиг 1:1 с оригиналом Велес Групп)
//   • GSAP ScrollTrigger — точечные fade-in элементы как в Tilda SBS
//   • GSAP SplitText — заголовки «въезжают» построчно из-под маски
//   • прогресс-бар, плавный скролл по якорям
//
// Полностью уважает prefers-reduced-motion: при reduced весь контент
// статичен (класс html.motion не выставляется — см. Layout.astro),
// а здесь мы рано выходим, оставляя лишь лёгкий прогресс-бар.
// ============================================================
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Прогресс-бар вверху страницы (работает в любом режиме). */
function initProgressBar(read: () => number) {
  const bar = document.querySelector<HTMLElement>("[data-scroll-progress]");
  if (!bar) return;
  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(read() / max, 1) : 0;
    bar.style.transform = `scaleX(${p})`;
  };
  update();
  return update;
}

/** Reveal: Tilda SBS blockintoview — чистый fade 0 → 1, без сдвига. */
function initReveals() {
  const items = gsap.utils.toArray<HTMLElement>("[data-reveal]");

  const reveal = (els: Element[]) =>
    gsap.to(els, {
      autoAlpha: 1,
      duration: 0.6,
      delay: 0.2,
      ease: "power1.inOut",
      overwrite: true,
    });

  // Защита: если высота окна неизвестна (странное окружение/ранний запуск) —
  // не прячем контент вовсе, просто показываем его статично.
  if (!window.innerHeight) {
    gsap.set(items, { autoAlpha: 1 });
    return;
  }

  gsap.set(items, { autoAlpha: 0 });

  // Что уже в кадре на первом экране — показываем сразу (на загрузке).
  const inView = items.filter(
    (el) => el.getBoundingClientRect().top < window.innerHeight,
  );
  if (inView.length) reveal(inView);

  // Остальное появляется по мере прокрутки.
  const rest = items.filter((el) => !inView.includes(el));
  ScrollTrigger.batch(rest, {
    start: "top 88%",
    once: true,
    onEnter: (els) => reveal(els as Element[]),
  });
}

/** Заголовки/крупные цифры: Tilda SplitText — строки выезжают из-под маски. */
function initSplitHeadings() {
  // Без вьюпорта — оставляем текст обычным и видимым.
  if (!window.innerHeight) {
    gsap.set("[data-split]", { autoAlpha: 1 });
    return;
  }
  document.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
    const split = SplitText.create(el, {
      type: "words,lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
    });
    gsap.set(el, { autoAlpha: 1 });
    gsap.from(split.lines, {
      yPercent: 100,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 75%", once: true },
    });
  });
}

/** Плавный скролл по якорным ссылкам с учётом высоты шапки. */
function initAnchors(lenis: Lenis) {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -80 });
    });
  });
}

export function initMotion() {
  // --- Reduced motion: статичный сайт + только прогресс-бар на нативном скролле
  if (REDUCE) {
    const update = initProgressBar(() => window.scrollY);
    if (update) window.addEventListener("scroll", update, { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  // --- Плавный скролл (значения 1:1 с оригиналом)
  const lenis = new Lenis({
    lerp: 0.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.95,
    touchMultiplier: 1.1,
  });

  // Мост Lenis ↔ ScrollTrigger (канонический паттерн)
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const updateBar = initProgressBar(() => window.scrollY);
  if (updateBar) lenis.on("scroll", updateBar);

  initAnchors(lenis);
  initReveals();

  // Заголовки рвём на строки только после загрузки шрифтов — иначе
  // переносы строк посчитаются по системному шрифту и поедут.
  document.fonts.ready.then(() => {
    initSplitHeadings();
    ScrollTrigger.refresh();
  });
}
