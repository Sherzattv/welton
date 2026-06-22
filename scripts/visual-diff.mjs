// ============================================================
// Визуальный диф: оригинал (Tilda) против Astro-ребилда.
// Снимает полностраничные скриншоты на ширинах брейкпоинтов Tilda,
// считает процент расхождения (pixelmatch) и собирает интерактивный
// HTML-отчёт с наложением (overlay) для попиксельной сверки вёрстки.
//
// Запуск:
//   1) поднять оба сервера (см. npm run diff:serve / dev)
//   2) node scripts/visual-diff.mjs
//   3) открыть visual-diff/report.html
// URL можно переопределить: ORIGINAL_URL=... REBUILD_URL=... node ...
// ============================================================
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const ORIGINAL = process.env.ORIGINAL_URL || "http://localhost:8765/";
const REBUILD = process.env.REBUILD_URL || "http://localhost:4321/";
const WIDTHS = (process.env.WIDTHS || "480,640,980,1200,1440")
  .split(",")
  .map((w) => parseInt(w.trim(), 10));
const OUT = path.resolve("visual-diff");

/** Прогон страницы до конца и обратно — чтобы догрузить ленивые
 *  картинки и привести анимации в финальное (статичное) состояние. */
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let y = 0;
        const step = () => {
          window.scrollTo(0, y);
          y += Math.round(window.innerHeight * 0.9);
          if (y < document.body.scrollHeight) setTimeout(step, 70);
          else {
            window.scrollTo(0, 0);
            setTimeout(resolve, 500);
          }
        };
        step();
      }),
  );
  await page.waitForTimeout(700);
}

async function shoot(context, url, width) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 1000 });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  } catch {
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
  }
  await settle(page);
  const buf = await page.screenshot({ fullPage: true });
  await page.close();
  return buf;
}

/** Дополнить картинку белым снизу/справа до размеров w×h. */
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

async function diffPair(aBuf, bBuf, width) {
  const am = await sharp(aBuf).metadata();
  const bm = await sharp(bBuf).metadata();
  const W = Math.max(am.width, bm.width);
  const H = Math.max(am.height, bm.height);

  const a = PNG.sync.read(await pad(aBuf, W, H));
  const b = PNG.sync.read(await pad(bBuf, W, H));
  const diff = new PNG({ width: W, height: H });
  const mismatched = pixelmatch(a.data, b.data, diff.data, W, H, {
    threshold: 0.12,
    includeAA: false,
    alpha: 0.5,
    diffColor: [233, 64, 87],
  });
  const pct = (mismatched / (W * H)) * 100;
  return { diffBuf: PNG.sync.write(diff), pct, W, H, aH: am.height, bH: bm.height };
}

function reportHTML(rows) {
  const tabs = rows
    .map(
      (r, i) =>
        `<button class="tab${i === 0 ? " on" : ""}" data-w="${r.width}">${r.width}px · ${r.pct.toFixed(2)}%</button>`,
    )
    .join("");
  const panels = rows
    .map(
      (r, i) => `
  <section class="panel${i === 0 ? " on" : ""}" data-w="${r.width}">
    <div class="meta">Расхождение: <b>${r.pct.toFixed(2)}%</b> · оригинал ${r.aH}px · ребилд ${r.bH}px высотой</div>
    <div class="controls">
      <label>Наложение <input type="range" min="0" max="100" value="50" class="op"></label>
      <label>Сдвиг по Y <input type="range" min="-200" max="200" value="0" class="dy"></label>
      <label class="chk"><input type="checkbox" class="bl" checked> режим «разница»</label>
      <span class="hint">чёрное = совпадает, цветное = разъехалось</span>
    </div>
    <div class="overlay">
      <img class="base" src="${r.width}-original.png" alt="оригинал">
      <img class="top" src="${r.width}-rebuild.png" alt="ребилд">
    </div>
    <details><summary>Показать раздельно: оригинал · ребилд · карта различий</summary>
      <div class="triptych">
        <figure><figcaption>Оригинал</figcaption><img src="${r.width}-original.png"></figure>
        <figure><figcaption>Ребилд</figcaption><img src="${r.width}-rebuild.png"></figure>
        <figure><figcaption>Различия</figcaption><img src="${r.width}-diff.png"></figure>
      </div>
    </details>
  </section>`,
    )
    .join("");

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Визуальный диф · Велес Групп</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{margin:0;background:#0e100f;color:#eee;font:14px/1.5 -apple-system,Inter,sans-serif}
  header{padding:18px 24px;border-bottom:1px solid #222}
  h1{margin:0 0 4px;font-size:18px}
  header p{margin:0;color:#9a9a9a;font-size:13px}
  .tabs{display:flex;flex-wrap:wrap;gap:8px;padding:14px 24px;position:sticky;top:0;background:#0e100f;border-bottom:1px solid #222;z-index:5}
  .tab{background:#1b1b1b;color:#c3c3c3;border:1px solid #333;border-radius:4px;padding:7px 12px;cursor:pointer;font:inherit}
  .tab.on{background:#22866b;color:#fff;border-color:#22866b}
  .panel{display:none;padding:20px 24px 60px}
  .panel.on{display:block}
  .meta{color:#9a9a9a;margin-bottom:12px}
  .controls{display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-bottom:14px;padding:12px;background:#161616;border-radius:6px}
  .controls label{display:flex;align-items:center;gap:8px;color:#c3c3c3}
  .controls input[type=range]{width:180px}
  .chk{cursor:pointer}
  .hint{color:#767676;font-size:12px}
  .overlay{position:relative;border:1px solid #222;background:#fff;width:fit-content;max-width:100%;overflow:auto}
  .overlay img{display:block;max-width:none}
  .overlay .top{position:absolute;left:0;top:0;mix-blend-mode:difference}
  .triptych{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}
  .triptych img{width:100%;border:1px solid #222;background:#fff}
  figcaption{color:#9a9a9a;margin-bottom:6px;font-size:12px}
  details{margin-top:14px}
  summary{cursor:pointer;color:#22a; color:#5ad}
</style></head><body>
<header>
  <h1>Визуальный диф — оригинал Tilda × Astro-ребилд</h1>
  <p>Меньше процент — точнее вёрстка. Двигай «Наложение» к 100%, чтобы листать как один сайт; режим «разница» подсвечивает каждый несовпавший пиксель.</p>
</header>
<div class="tabs">${tabs}</div>
${panels}
<script>
  const tabs=[...document.querySelectorAll('.tab')];
  const panels=[...document.querySelectorAll('.panel')];
  tabs.forEach(t=>t.onclick=()=>{
    const w=t.dataset.w;
    tabs.forEach(x=>x.classList.toggle('on',x===t));
    panels.forEach(p=>p.classList.toggle('on',p.dataset.w===w));
  });
  panels.forEach(p=>{
    const top=p.querySelector('.top');
    const op=p.querySelector('.op'), dy=p.querySelector('.dy'), bl=p.querySelector('.bl');
    const apply=()=>{
      top.style.opacity=op.value/100;
      top.style.transform='translateY('+dy.value+'px)';
      top.style.mixBlendMode=bl.checked?'difference':'normal';
    };
    [op,dy,bl].forEach(c=>c.addEventListener('input',apply));
    apply();
  });
</script>
</body></html>`;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  // reducedMotion: ребилд отдаёт статичный финальный layout (без анимаций),
  // что и нужно для честного сравнения именно вёрстки.
  const context = await browser.newContext({
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });

  const rows = [];
  for (const width of WIDTHS) {
    process.stdout.write(`  ${width}px … `);
    const [aBuf, bBuf] = [
      await shoot(context, ORIGINAL, width),
      await shoot(context, REBUILD, width),
    ];
    await writeFile(path.join(OUT, `${width}-original.png`), aBuf);
    await writeFile(path.join(OUT, `${width}-rebuild.png`), bBuf);
    const { diffBuf, pct, aH, bH } = await diffPair(aBuf, bBuf, width);
    await writeFile(path.join(OUT, `${width}-diff.png`), diffBuf);
    rows.push({ width, pct, aH, bH });
    console.log(`расхождение ${pct.toFixed(2)}%`);
  }

  await browser.close();
  await writeFile(path.join(OUT, "report.html"), reportHTML(rows));

  console.log("\nИтог по ширинам:");
  for (const r of rows) console.log(`  ${String(r.width).padStart(5)}px  ${r.pct.toFixed(2)}%`);
  console.log(`\nОтчёт: ${path.join(OUT, "report.html")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
