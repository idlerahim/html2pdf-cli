// hazno-hasashi
const puppeteer = require("puppeteer");
const path = require("path");

function parseArgs(argv) {
  const out = { file: null, outPath: null, raw: {} };
  const args = argv.slice(2);
  if (args.length === 0) return out;

  out.file = args[0];
  out.outPath = args[1] || "out.pdf";

  // simple flag parsing: --height <val> --width <val>
  for (let i = 2; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith("--")) {
        out.raw[key.toLowerCase()] = val;
        i++;
      } else {
        out.raw[key.toLowerCase()] = "true";
      }
    }
  }
  return out;
}

function parseDimension(value, isWidth) {
  if (value == null) return null;
  const v = String(value).toLowerCase().trim();

  if (v === "a4") {
    // A4 portrait: 8.27in x 11.69in
    return { unit: "in", value: isWidth ? 8.27 : 11.69 };
  }

  // matches number with optional unit: 200, 200px, 8.5in, 210mm
  const m = v.match(/^([0-9]*\.?[0-9]+)\s*(px|in|mm)?$/);
  if (m) {
    const num = Number(m[1]);
    const unit = (m[2] || "px");
    if (unit === "px") return { unit: "px", value: Math.round(num) };
    if (unit === "in") return { unit: "in", value: num };
    if (unit === "mm") return { unit: "mm", value: num };
  }

  return null;
}

async function getFullDimensions(page) {
  return await page.evaluate(() => {
    const safeNum = v => (Number.isFinite(v) ? Math.round(v) : 0);

    const docW = Math.max(
      document.documentElement.scrollWidth || 0,
      document.body.scrollWidth || 0,
      document.documentElement.offsetWidth || 0,
      document.body.offsetWidth || 0,
      document.documentElement.clientWidth || 0
    );
    const docH = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body.scrollHeight || 0,
      document.documentElement.offsetHeight || 0,
      document.body.offsetHeight || 0,
      window.innerHeight || 0
    );

    let maxChildW = 0;
    let maxChildH = 0;
    try {
      const elems = Array.from(document.querySelectorAll("*"));
      elems.forEach(el => {
        const cs = getComputedStyle(el);
        if (["auto", "scroll"].includes(cs.overflow) || ["auto", "scroll"].includes(cs.overflowY) || ["auto", "scroll"].includes(cs.overflowX)) {
          maxChildW = Math.max(maxChildW, el.scrollWidth || 0);
          maxChildH = Math.max(maxChildH, el.scrollHeight || 0);
        } else {
          maxChildW = Math.max(maxChildW, el.offsetWidth || 0, el.scrollWidth || 0);
          maxChildH = Math.max(maxChildH, el.offsetHeight || 0, el.scrollHeight || 0);
        }
      });
    } catch (e) {}

    let maxIframeW = 0;
    let maxIframeH = 0;
    try {
      for (let i = 0; i < window.frames.length; i++) {
        try {
          const fdoc = window.frames[i].document;
          maxIframeW = Math.max(maxIframeW, fdoc.documentElement.scrollWidth || 0, fdoc.body.scrollWidth || 0);
          maxIframeH = Math.max(maxIframeH, fdoc.documentElement.scrollHeight || 0, fdoc.body.scrollHeight || 0);
        } catch (e) {}
      }
    } catch (e) {}

    const width = safeNum(Math.max(docW, maxChildW, maxIframeW));
    const height = safeNum(Math.max(docH, maxChildH, maxIframeH));

    return { width, height };
  });
}

function dimensionToPdfString(dim) {
  if (!dim) return null;
  if (dim.unit === "px") return `${dim.value}px`;
  if (dim.unit === "in") return `${dim.value}in`;
  if (dim.unit === "mm") return `${dim.value}mm`;
  return null;
}

function mmToIn(mm) {
  return mm / 25.4;
}

(async () => {
  const args = parseArgs(process.argv);
  if (!args.file) {
    console.error("Usage: node mhtml-to-pdf.js /path/to/file.mhtml [out.pdf] [--height <val>] [--width <val>]");
    process.exit(1);
  }

  const userHeightRaw = args.raw.height;
  const userWidthRaw = args.raw.width;

  const userHeight = userHeightRaw ? parseDimension(userHeightRaw, false) : null;
  const userWidth = userWidthRaw ? parseDimension(userWidthRaw, true) : null;

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();

  const filePath = path.resolve(args.file);
  await page.goto("file://" + filePath, { waitUntil: "networkidle0" });

  // small delay for JS-driven layout, compatible with older puppeteer
  await new Promise(r => setTimeout(r, 250));

  let measured = {};
  if (!userHeight || !userWidth) {
    measured = await getFullDimensions(page); // px
  }

  // Decide final width/height in px or inches
  // If user provided px use that. If user provided in/mm convert to pdf string.
  // If user provided only one dimension, measure the other.
  let finalWidth = null;
  let finalHeight = null;

  if (userWidth) {
    if (userWidth.unit === "px") finalWidth = `${userWidth.value}px`;
    if (userWidth.unit === "in") finalWidth = `${userWidth.value}in`;
    if (userWidth.unit === "mm") finalWidth = `${userWidth.value}mm`;
  } else {
    finalWidth = `${measured.width}px`;
  }

  if (userHeight) {
    if (userHeight.unit === "px") finalHeight = `${userHeight.value}px`;
    if (userHeight.unit === "in") finalHeight = `${userHeight.value}in`;
    if (userHeight.unit === "mm") finalHeight = `${userHeight.value}mm`;
  } else {
    finalHeight = `${measured.height}px`;
  }

  // If user passed mm as number without unit, parseDimension would treat as px.
  // No extra handling required.

  // For viewport we need px values. Compute viewportWidthPx and viewportHeightPx
  let viewportWidthPx = measured.width;
  let viewportHeightPx = measured.height;

  if (userWidth) {
    if (userWidth.unit === "px") viewportWidthPx = userWidth.value;
    if (userWidth.unit === "in") viewportWidthPx = Math.round(userWidth.value * 96);
    if (userWidth.unit === "mm") viewportWidthPx = Math.round(mmToIn(userWidth.value) * 96);
  }

  if (userHeight) {
    if (userHeight.unit === "px") viewportHeightPx = userHeight.value;
    if (userHeight.unit === "in") viewportHeightPx = Math.round(userHeight.value * 96);
    if (userHeight.unit === "mm") viewportHeightPx = Math.round(mmToIn(userHeight.value) * 96);
  }

  // Safety cap to avoid extremely tall single pages
  const MAX_HEIGHT_PX = 20000;
  if (viewportHeightPx > MAX_HEIGHT_PX) {
    console.warn(`Measured/calc height ${viewportHeightPx}px exceeds cap ${MAX_HEIGHT_PX}px. Capping.`);
    viewportHeightPx = MAX_HEIGHT_PX;
    finalHeight = `${MAX_HEIGHT_PX}px`;
  }

  // ensure reasonable minimum width
  viewportWidthPx = Math.max(200, viewportWidthPx);

  await page.setViewport({ width: viewportWidthPx, height: Math.min(viewportHeightPx, MAX_HEIGHT_PX) });

  console.log("Using PDF size:", finalWidth, "x", finalHeight);

  await page.pdf({
    path: args.outPath,
    width: finalWidth,
    height: finalHeight,
    printBackground: true,
    preferCSSPageSize: false
  });

  await browser.close();
  console.log("PDF written to", args.outPath);
})();
