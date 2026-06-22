// ============================================================
// Посекционный визуальный диф: оригинал (Tilda) против Astro-ребилда.
// Снимает полную страницу каждого сайта, режет её на секции по карте
// соответствия и считает % расхождения по КАЖДОЙ секции отдельно —
// так метрика становится осмысленной (полностраничный % забивался
// разной высотой и лишними блоками).
//
// Запуск:
//   npm run diff:serve   (оригинал на :8765)
//   npm run diff         (этот скрипт)
//   открыть visual-diff/report.html
// ============================================================
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const ORIGINAL = process.env.ORIGINAL_URL || "http://localhost:8765/";
const REBUILD = process.env.REBUILD_URL || "http://localhost:4321/";
const WIDTHS = (process.env.WIDTHS || "1200,640").split(",").map((n) => parseInt(n.trim(), 10));
const OUT = path.resolve("visual-diff");

// Карта секций: селектор в оригинале (Tilda record) ↔ селектор в ребилде.
// null = секции нет на этой стороне (диф не считаем, показываем как есть).
const SECTIONS = [
  { name: "Hero", original: "#rec1988331021", rebuild: "#top" },
  { name: "Stats", original: "#rec1997626802", rebuild: "#about" },
  { name: "Services", original: "#rec1997890712", rebuild: "#services" },
  { name: "Advantages", original: "#rec2003448691", rebuild: "#advantages" },
  { name: "Objects", original: null, rebuild: "#objects" },
  { name: "Partners", original: "#rec2048718351", rebuild: "#partners" },
  { name: "Stages", original: "#rec2049072211", rebuild: "#stages" },
  { name: "CTA", original: "#rec2049227251", rebuild: "#invoice" },
  { name: "FAQ", original: "#rec2049451851", rebuild: "#faq" },
  { name: "Footer", original: "#rec2049652011", rebuild: "#contacts" },
];

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let y = 0;
        const step = () => {
          window.scrollTo(0, y);
          y += Math.round(window.innerHeight * 0.9);
          if (y < document.body.scrollHeight) setTimeout(step, 60);
          else {
            window.scrollTo(0, 0);
            setTimeout(resolve, 400);
          }
        };
        step();
      }),
  );
  await page.waitForTimeout(500);
}

/** Снять полную страницу + измерить верхние границы секций (абсолютные). */
async function capture(ctx, url, width, side) {
  const selectors = SECTIONS.map((s) => s[side]).filter(Boolean);
  const page = await ctx.newPage();
  await page.setViewportSize({ width, height: 1000 });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
  }
  await settle(page);
  const tops = await page.evaluate((sels) => {
    const m = {};
    for (const sel of sels) {
      const el = document.querySelector(sel);
      if (el) m[sel] = Math.round(el.getBoundingClientRect().top + window.scrollY);
    }
    m.__pageH = document.documentElement.scrollHeight;
    return m;
  }, selectors);
  const buf = await page.screenshot({ fullPage: true });
  await page.close();
  return { buf, tops };
}

/** Нарезать секции из полностраничного буфера по отсортированным top. */
async function sliceSections(buf, tops, side) {
  const meta = await sharp(buf).metadata();
  const present = SECTIONS.filter((s) => s[side] && tops[s[side]] != null)
    .map((s) => ({ name: s.name, top: tops[s[side]] }))
    .sort((a, b) => a.top - b.top);
  const pageH = Math.min(meta.height, tops.__pageH || meta.height);

  const out = {};
  for (let i = 0; i < present.length; i++) {
    const top = Math.max(0, present[i].top);
    const bottom = i + 1 < present.length ? present[i + 1].top : pageH;
    const height = Math.max(1, Math.min(meta.height - top, bottom - top));
    out[present[i].name] = await sharp(buf)
      .extract({ left: 0, top, width: meta.width, height })
      .png()
      .toBuffer();
  }
  return out;
}

async function pad(buf, w, h) {
  const img = sharp(buf);
  const { width = 0, height = 0 } = await img.metadata();
  return img
    .extend({
      top: 0,
      left: 0,
      right: Math.max(0, w - width),
      bottom: Math.max(0, h - height),
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();
}

async function diffPair(aBuf, bBuf) {
  const am = await sharp(aBuf).metadata();
  const bm = await sharp(bBuf).metadata();
  const W = Math.max(am.width, bm.width);
  const H = Math.max(am.height, bm.height);
  const a = PNG.sync.read(await pad(aBuf, W, H));
  const b = PNG.sync.read(await pad(bBuf, W, H));
  const diff = new PNG({ width: W, height: H });
  const n = pixelmatch(a.data, b.data, diff.data, W, H, {
    threshold: 0.12,
    includeAA: false,
    alpha: 0.5,
    diffColor: [233, 64, 87],
  });
  return { diffBuf: PNG.sync.write(diff), pct: (n / (W * H)) * 100, aH: am.height, bH: bm.height };
}

function report(data, widths) {
  // data: { [section]: { [width]: {pct, aH, bH, has} } }
  const sections = SECTIONS.map((s) => s.name);
  const cell = (s, w) => {
    const d = data[s]?.[w];
    if (!d) return `<td class="na">—</td>`;
    if (!d.has) return `<td class="only">только&nbsp;ребилд</td>`;
    const hue = Math.max(0, 120 - Math.min(120, d.pct * 2.2)); // зелёный→красный
    return `<td style="background:hsl(${hue} 45% 22%)"><b>${d.pct.toFixed(1)}%</b></td>`;
  };
  const matrix = `<table class="matrix"><thead><tr><th>Секция</th>${widths.map((w) => `<th>${w}px</th>`).join("")}</tr></thead><tbody>${sections
    .map((s) => `<tr><th>${s}</th>${widths.map((w) => cell(s, w)).join("")}</tr>`)
    .join("")}</tbody></table>`;

  const tabs = sections.map((s, i) => `<button class="tab${i === 0 ? " on" : ""}" data-s="${s}">${s}</button>`).join("");
  const panels = sections
    .map((s, i) => {
      const widthsBlocks = widths
        .map((w) => {
          const d = data[s]?.[w];
          if (!d) return "";
          const base = `${w}-${s}-original.png`;
          const top = `${w}-${s}-rebuild.png`;
          if (!d.has)
            return `<div class="wblock"><div class="wmeta">${w}px · только в ребилде</div><img class="solo" src="${top}"></div>`;
          return `<div class="wblock">
            <div class="wmeta">${w}px · расхождение <b>${d.pct.toFixed(1)}%</b> · ориг ${d.aH}px / ребилд ${d.bH}px</div>
            <div class="controls"><label>Наложение <input type="range" min="0" max="100" value="50" class="op"></label>
              <label>Сдвиг Y <input type="range" min="-120" max="120" value="0" class="dy"></label>
              <label class="chk"><input type="checkbox" class="bl" checked> разница</label></div>
            <div class="overlay"><img class="bb" src="${base}"><img class="tt" src="${top}"></div>
            <details><summary>раздельно: ориг · ребилд · diff</summary>
              <div class="trip"><img src="${base}"><img src="${top}"><img src="${w}-${s}-diff.png"></div></details>
          </div>`;
        })
        .join("");
      return `<section class="panel${i === 0 ? " on" : ""}" data-s="${s}"><h2>${s}</h2>${widthsBlocks}</section>`;
    })
    .join("");

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Посекционный диф · Велес Групп</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;background:#0e100f;color:#eee;font:14px/1.5 -apple-system,Inter,sans-serif}
header{padding:18px 24px;border-bottom:1px solid #222}h1{margin:0 0 4px;font-size:18px}header p{margin:0;color:#9a9a9a;font-size:13px}
.matrix{border-collapse:collapse;margin:18px 24px}.matrix th,.matrix td{border:1px solid #2a2a2a;padding:6px 12px;text-align:center;font-size:13px}
.matrix thead th{background:#1b1b1b;color:#c3c3c3}.matrix tbody th{background:#161616;color:#eee;text-align:left}
.matrix td.na{color:#555}.matrix td.only{color:#c3a36a;font-size:11px}
.tabs{display:flex;flex-wrap:wrap;gap:8px;padding:14px 24px;position:sticky;top:0;background:#0e100f;border-bottom:1px solid #222;z-index:5}
.tab{background:#1b1b1b;color:#c3c3c3;border:1px solid #333;border-radius:4px;padding:7px 12px;cursor:pointer;font:inherit}
.tab.on{background:#22866b;color:#fff;border-color:#22866b}
.panel{display:none;padding:18px 24px 60px}.panel.on{display:block}.panel h2{margin:0 0 14px;font-size:16px}
.wblock{margin-bottom:26px;padding:14px;background:#131313;border:1px solid #222;border-radius:8px}
.wmeta{color:#9a9a9a;margin-bottom:10px}
.controls{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-bottom:12px}
.controls label{display:flex;align-items:center;gap:8px;color:#c3c3c3}.controls input[type=range]{width:160px}
.overlay{position:relative;border:1px solid #222;background:#fff;width:fit-content;max-width:100%;overflow:auto}
.overlay img{display:block;max-width:none}.overlay .tt{position:absolute;left:0;top:0;mix-blend-mode:difference}
.solo{border:1px solid #222;background:#fff;max-width:100%}
.trip{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px}.trip img{width:100%;border:1px solid #222;background:#fff}
details{margin-top:10px}summary{cursor:pointer;color:#5ad}
</style></head><body>
<header><h1>Посекционный диф — оригинал Tilda × Astro-ребилд</h1>
<p>Цвет в таблице: зелёный = близко, красный = далеко. Открой секцию, двигай «Наложение» к 100% и сдвиг Y для выравнивания; «разница» подсвечивает несовпавшее.</p></header>
${matrix}
<div class="tabs">${tabs}</div>
${panels}
<script>
const tabs=[...document.querySelectorAll('.tab')],panels=[...document.querySelectorAll('.panel')];
tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.toggle('on',x===t));panels.forEach(p=>p.classList.toggle('on',p.dataset.s===t.dataset.s));});
panels.forEach(p=>p.querySelectorAll('.wblock').forEach(wb=>{const tt=wb.querySelector('.tt');if(!tt)return;
  const op=wb.querySelector('.op'),dy=wb.querySelector('.dy'),bl=wb.querySelector('.bl');
  const ap=()=>{tt.style.opacity=op.value/100;tt.style.transform='translateY('+dy.value+'px)';tt.style.mixBlendMode=bl.checked?'difference':'normal';};
  [op,dy,bl].forEach(c=>c.addEventListener('input',ap));ap();}));
</script></body></html>`;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ reducedMotion: "reduce", deviceScaleFactor: 1 });

  const data = {};
  for (const width of WIDTHS) {
    process.stdout.write(`\n  ${width}px:\n`);
    const a = await capture(ctx, ORIGINAL, width, "original");
    const b = await capture(ctx, REBUILD, width, "rebuild");
    const aSlices = await sliceSections(a.buf, a.tops, "original");
    const bSlices = await sliceSections(b.buf, b.tops, "rebuild");

    for (const s of SECTIONS) {
      data[s.name] ??= {};
      const ob = aSlices[s.name];
      const rb = bSlices[s.name];
      if (rb && ob) {
        await writeFile(path.join(OUT, `${width}-${s.name}-original.png`), ob);
        await writeFile(path.join(OUT, `${width}-${s.name}-rebuild.png`), rb);
        const { diffBuf, pct, aH, bH } = await diffPair(ob, rb);
        await writeFile(path.join(OUT, `${width}-${s.name}-diff.png`), diffBuf);
        data[s.name][width] = { pct, aH, bH, has: true };
        console.log(`    ${s.name.padEnd(11)} ${pct.toFixed(1)}%`);
      } else if (rb) {
        await writeFile(path.join(OUT, `${width}-${s.name}-rebuild.png`), rb);
        data[s.name][width] = { has: false };
        console.log(`    ${s.name.padEnd(11)} — только ребилд`);
      }
    }
  }

  await browser.close();
  await writeFile(path.join(OUT, "report.html"), report(data, WIDTHS));
  console.log(`\nОтчёт: ${path.join(OUT, "report.html")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
