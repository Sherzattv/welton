// Логика клиентского фильтра каталога проектов.
// Запускается из CatalogFilters.astro. Работает на статике:
// читает data-атрибуты <li data-catalog-item>, скрывает несоответствующие,
// синхронизирует URL через replaceState (?q=&floors=1&beds=2&area=80-120&sort=area-asc).
//
// UX:
//   • Поиск по title, tagline и коду проекта (WLT-NN); debounce 180ms.
//   • Сортировка: default | area-asc | area-desc | beds-desc.
//   • Чипы площади: фиксированные диапазоны (all/0-80/80-120/120-180/180+).
//   • Счётчики на чипах: показывают сколько проектов в каждом варианте
//     при остальных АКТИВНЫХ фильтрах (превентивная обратная связь).
//   • Reset-кнопка снимает все активные фильтры разом.
//   • Мобильный bottom-sheet + FAB.

export type FloorsValue = "all" | "1" | "2";
export type BedsValue = "all" | "1" | "2" | "3" | "4+";
export type AreaValue = "all" | "0-80" | "80-120" | "120-180" | "180+";
export type SortValue = "default" | "area-asc" | "area-desc" | "beds-desc";

export interface FilterState {
  q: string;
  category: string; // "all" | slug категории
  tech: string; // "all" | ключ технологии (матч по вхождению в список проекта)
  feature: string; // "all" | ключ особенности (матч по вхождению в список проекта)
  floors: FloorsValue;
  beds: BedsValue;
  area: AreaValue;
  sort: SortValue;
}

const debounce = <T extends (...a: never[]) => void>(fn: T, ms: number) => {
  let t: number | undefined;
  return (...args: Parameters<T>) => {
    if (t !== undefined) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
};

interface CardInfo {
  el: HTMLElement;
  floors: string;
  area: number;
  bedrooms: number;
  category: string;
  tech: string[];
  features: string[];
  searchHaystack: string;
  defaultIndex: number;
}

function inAreaRange(area: number, range: AreaValue): boolean {
  switch (range) {
    case "all":
      return true;
    case "0-80":
      return area < 80;
    case "80-120":
      return area >= 80 && area < 120;
    case "120-180":
      return area >= 120 && area < 180;
    case "180+":
      return area >= 180;
  }
}

// Скролл к началу каталога (после hero). Через Lenis, если он активен,
// иначе нативно. Шапка не фиксирована — оффсет не нужен.
function scrollCatalogIntoView() {
  const target = document.querySelector<HTMLElement>(".catalog-shell");
  if (!target) return;
  const lenis = (
    window as unknown as {
      __weltonLenis?: {
        scrollTo: (
          t: HTMLElement,
          o?: { offset?: number; duration?: number },
        ) => void;
      };
    }
  ).__weltonLenis;
  if (lenis?.scrollTo) {
    lenis.scrollTo(target, { offset: 0, duration: 0.6 });
  } else {
    const top = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: "smooth" });
  }
}

export function initCatalogFilters(root: HTMLElement) {
  const cardEls = Array.from(
    document.querySelectorAll<HTMLElement>("[data-catalog-item]"),
  );
  const grid = cardEls[0]?.parentElement ?? null;
  const emptyEl = document.querySelector<HTMLElement>("[data-catalog-empty]");

  const countEl = root.querySelector<HTMLElement>("[data-filter-count]");
  const countMobileEl = root.querySelector<HTMLElement>(
    "[data-filter-count-mobile]",
  );
  const totalEl = root.querySelector<HTMLElement>("[data-filter-total]");
  const resetBtns = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-filters-reset]"),
  );

  const searchInput = root.querySelector<HTMLInputElement>(
    "[data-search-input]",
  );
  const sortSelect =
    root.querySelector<HTMLSelectElement>("[data-sort-select]");
  const floorsChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-floors-chip]"),
  );
  const bedsChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-beds-chip]"),
  );
  const areaChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-area-chip]"),
  );
  const catChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-cat-chip]"),
  );
  const techChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-tech-chip]"),
  );
  const featChips = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-feat-chip]"),
  );

  if (!grid) return;

  const cards: CardInfo[] = cardEls.map((el, i) => {
    const title = el.querySelector("h3")?.textContent ?? "";
    const tagline = el.querySelector("p")?.textContent ?? "";
    const code = el.dataset.code ?? "";
    return {
      el,
      floors: el.dataset.floors ?? "",
      area: Number(el.dataset.area ?? 0),
      bedrooms: Number(el.dataset.bedrooms ?? 0),
      category: el.dataset.category ?? "",
      tech: (el.dataset.tech ?? "").split(",").filter(Boolean),
      features: (el.dataset.features ?? "").split(",").filter(Boolean),
      searchHaystack: `${title} ${tagline} ${code}`.toLowerCase(),
      defaultIndex: i,
    };
  });

  if (totalEl) totalEl.textContent = String(cards.length);

  const state: FilterState = {
    q: "",
    category: "all",
    tech: "all",
    feature: "all",
    floors: "all",
    beds: "all",
    area: "all",
    sort: "default",
  };

  // ─── URL state ─────────────────────────────────────────────────────
  function readUrl() {
    const p = new URLSearchParams(window.location.search);
    const q = p.get("q");
    if (q) state.q = q;
    const cat = p.get("category");
    if (cat) state.category = cat;
    const tech = p.get("tech");
    if (tech) state.tech = tech;
    const feat = p.get("feature");
    if (feat) state.feature = feat;
    const f = p.get("floors");
    if (f === "1" || f === "2") state.floors = f;
    const b = p.get("beds");
    if (b === "1" || b === "2" || b === "3" || b === "4+") state.beds = b;
    const a = p.get("area");
    if (a === "0-80" || a === "80-120" || a === "120-180" || a === "180+")
      state.area = a;
    const s = p.get("sort");
    if (s === "area-asc" || s === "area-desc" || s === "beds-desc")
      state.sort = s;
  }

  function writeUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.category !== "all") p.set("category", state.category);
    if (state.tech !== "all") p.set("tech", state.tech);
    if (state.feature !== "all") p.set("feature", state.feature);
    if (state.floors !== "all") p.set("floors", state.floors);
    if (state.beds !== "all") p.set("beds", state.beds);
    if (state.area !== "all") p.set("area", state.area);
    if (state.sort !== "default") p.set("sort", state.sort);
    const qs = p.toString();
    const url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState({}, "", url);
  }

  // ─── Матч карточки с подменой части состояния (для chip-counts) ──
  function matchesWith(
    card: CardInfo,
    override: Partial<FilterState>,
  ): boolean {
    const s: FilterState = { ...state, ...override };
    if (s.q && !card.searchHaystack.includes(s.q.toLowerCase())) return false;
    if (s.category !== "all" && card.category !== s.category) return false;
    if (s.tech !== "all" && !card.tech.includes(s.tech)) return false;
    if (s.feature !== "all" && !card.features.includes(s.feature)) return false;
    if (s.floors !== "all" && card.floors !== s.floors) return false;
    if (!inAreaRange(card.area, s.area)) return false;
    if (s.beds !== "all") {
      if (s.beds === "4+") {
        if (card.bedrooms < 4) return false;
      } else if (String(card.bedrooms) !== s.beds) return false;
    }
    return true;
  }

  function isDefault(): boolean {
    return (
      state.q === "" &&
      state.category === "all" &&
      state.tech === "all" &&
      state.feature === "all" &&
      state.floors === "all" &&
      state.beds === "all" &&
      state.area === "all" &&
      state.sort === "default"
    );
  }

  // ─── UI sync ──────────────────────────────────────────────────────
  function syncChipsGroup<T extends string>(
    chips: HTMLButtonElement[],
    valueAttr: keyof DOMStringMap,
    current: T,
    setOverride: (v: T) => Partial<FilterState>,
  ) {
    for (const c of chips) {
      const v = c.dataset[valueAttr as string] as T;
      const on = v === current;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", on ? "true" : "false");

      const countNode = c.querySelector<HTMLElement>("[data-chip-count]");
      if (countNode) {
        const n = cards.filter((card) =>
          matchesWith(card, setOverride(v)),
        ).length;
        countNode.textContent = String(n);
      }
    }
  }

  function syncChips() {
    syncChipsGroup(catChips, "catValue", state.category, (v) => ({
      category: v,
    }));
    syncChipsGroup(techChips, "techValue", state.tech, (v) => ({
      tech: v,
    }));
    syncChipsGroup(featChips, "featValue", state.feature, (v) => ({
      feature: v,
    }));
    syncChipsGroup(floorsChips, "floorsValue", state.floors, (v) => ({
      floors: v as FloorsValue,
    }));
    syncChipsGroup(bedsChips, "bedsValue", state.beds, (v) => ({
      beds: v as BedsValue,
    }));
    syncChipsGroup(areaChips, "areaValue", state.area, (v) => ({
      area: v as AreaValue,
    }));
  }

  function syncSearchSort() {
    if (searchInput && searchInput.value !== state.q)
      searchInput.value = state.q;
    if (sortSelect && sortSelect.value !== state.sort)
      sortSelect.value = state.sort;
  }

  // ─── Сортировка: переставляем DOM-узлы внутри grid ────────────────
  function applySort() {
    const sorted = [...cards];
    if (state.sort === "area-asc") {
      sorted.sort((a, b) => a.area - b.area);
    } else if (state.sort === "area-desc") {
      sorted.sort((a, b) => b.area - a.area);
    } else if (state.sort === "beds-desc") {
      sorted.sort((a, b) => b.bedrooms - a.bedrooms);
    } else {
      sorted.sort((a, b) => a.defaultIndex - b.defaultIndex);
    }
    for (const card of sorted) grid!.appendChild(card.el);
  }

  // ─── Sheet (мобильный bottom-sheet) ──────────────────────────
  const fab = document.querySelector<HTMLButtonElement>("[data-cf-fab]");
  const backdrop = document.querySelector<HTMLElement>("[data-cf-backdrop]");
  const fabCount = document.querySelector<HTMLElement>("[data-fab-count]");
  const sheetCount = root.querySelector<HTMLElement>("[data-sheet-count]");
  const closeButtons = Array.from(
    document.querySelectorAll<HTMLElement>("[data-cf-close]"),
  );

  function activeFilterCount(): number {
    let n = 0;
    if (state.q) n++;
    if (state.category !== "all") n++;
    if (state.tech !== "all") n++;
    if (state.feature !== "all") n++;
    if (state.floors !== "all") n++;
    if (state.beds !== "all") n++;
    if (state.area !== "all") n++;
    if (state.sort !== "default") n++;
    return n;
  }

  // Сохраняем scroll-позицию: фиксируем body жёстко, чтобы не дёргался.
  let savedScroll = 0;

  function openSheet() {
    savedScroll = window.scrollY;
    root.classList.add("is-open");
    backdrop?.classList.add("is-open");
    backdrop?.setAttribute("aria-hidden", "false");
    fab?.setAttribute("aria-expanded", "true");
    fab?.classList.add("is-hidden");
    document.documentElement.classList.add("cf-locked");
    document.body.style.top = `-${savedScroll}px`;
  }

  function closeSheet(opts?: { scrollToCatalog?: boolean }) {
    root.classList.remove("is-open");
    backdrop?.classList.remove("is-open");
    backdrop?.setAttribute("aria-hidden", "true");
    fab?.setAttribute("aria-expanded", "false");
    fab?.classList.remove("is-hidden");
    document.documentElement.classList.remove("cf-locked");
    document.body.style.top = "";

    if (opts?.scrollToCatalog) {
      // Прокручиваем к началу каталога (после hero) — плавно, через Lenis.
      scrollCatalogIntoView();
    } else {
      window.scrollTo(0, savedScroll);
    }
  }

  fab?.addEventListener("click", openSheet);
  backdrop?.addEventListener("click", () => closeSheet());
  for (const b of closeButtons) {
    const scrollOnClose = b.classList.contains("cf-sheet-btn--solid");
    b.addEventListener("click", () =>
      closeSheet({ scrollToCatalog: scrollOnClose }),
    );
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) closeSheet();
  });

  function apply() {
    let visible = 0;
    for (const card of cards) {
      const ok = matchesWith(card, {});
      card.el.classList.toggle("is-hidden", !ok);
      if (ok) visible++;
    }
    if (countEl) countEl.textContent = String(visible);
    if (countMobileEl) countMobileEl.textContent = String(visible);
    if (sheetCount) sheetCount.textContent = String(visible);
    if (emptyEl) emptyEl.classList.toggle("is-visible", visible === 0);
    for (const b of resetBtns) b.toggleAttribute("disabled", isDefault());

    if (fabCount) {
      const n = activeFilterCount();
      if (n > 0) {
        fabCount.textContent = String(n);
        fabCount.hidden = false;
      } else {
        fabCount.hidden = true;
      }
    }
  }

  function syncAll() {
    applySort();
    apply();
    syncChips();
    syncSearchSort();
    writeUrl();
  }

  // Применение фильтра по клику: syncAll + скролл к началу каталога.
  // На мобиле (открытый bottom-sheet) не скроллим — это делает кнопка «Показать».
  function applyInteractive() {
    syncAll();
    if (!root.classList.contains("is-open")) scrollCatalogIntoView();
  }

  // ─── Bindings ─────────────────────────────────────────────────────
  for (const c of floorsChips) {
    c.addEventListener("click", () => {
      state.floors = c.dataset.floorsValue as FloorsValue;
      applyInteractive();
    });
  }
  for (const c of bedsChips) {
    c.addEventListener("click", () => {
      state.beds = c.dataset.bedsValue as BedsValue;
      applyInteractive();
    });
  }
  for (const c of areaChips) {
    c.addEventListener("click", () => {
      state.area = c.dataset.areaValue as AreaValue;
      applyInteractive();
    });
  }
  for (const c of catChips) {
    c.addEventListener("click", () => {
      state.category = c.dataset.catValue ?? "all";
      applyInteractive();
    });
  }
  for (const c of techChips) {
    c.addEventListener("click", () => {
      state.tech = c.dataset.techValue ?? "all";
      applyInteractive();
    });
  }
  for (const c of featChips) {
    c.addEventListener("click", () => {
      state.feature = c.dataset.featValue ?? "all";
      applyInteractive();
    });
  }

  if (searchInput) {
    const onSearch = debounce(() => {
      state.q = searchInput.value.trim();
      apply();
      syncChips();
      writeUrl();
    }, 180);
    searchInput.addEventListener("input", onSearch);
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      state.sort = sortSelect.value as SortValue;
      applyInteractive();
    });
  }

  for (const b of resetBtns) {
    b.addEventListener("click", () => {
      state.q = "";
      state.category = "all";
      state.tech = "all";
      state.feature = "all";
      state.floors = "all";
      state.beds = "all";
      state.area = "all";
      state.sort = "default";
      applyInteractive();
    });
  }

  // ─── Init ─────────────────────────────────────────────────────────
  readUrl();
  syncAll();
}
