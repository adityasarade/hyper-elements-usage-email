/**
 * Opens out/<slug>.design.json (written by `npm run design-json`) in Unlayer's builder, the drag-and-drop
 * editor, and saves a screenshot: docs/builder.png. Optionally selects the first heading so its editing panel
 * shows. Needs network access to editor.unlayer.com and a local Chromium (Playwright).
 *
 *   node scripts/builder-preview.mjs <slug> <email|web|document> [width] [height] [clickX clickY]
 *
 * With a click position (CSS px in the window), it clicks there after loading, to select a block and show its
 * editing panel.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const require = createRequire(resolve("package.json"));
const { chromium } = require("playwright");
const [slug, displayMode = "email", width = "1600", height = "1000", clickX, clickY] = process.argv.slice(2);
if (!slug) throw new Error("usage: node scripts/builder-preview.mjs <slug> <email|web|document> [width] [height]");

const design = await readFile(join("out", `${slug}.design.json`), "utf8");
const page = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}#editor{height:100vh}</style></head>
<body><div id="editor"></div><script src="https://editor.unlayer.com/embed.js"></script><script>
const editor = unlayer.createEditor({ id: "editor", displayMode: ${JSON.stringify(displayMode)} });
editor.addEventListener("editor:ready", async () => {
  editor.loadDesign(await (await fetch("/design.json")).json());
  setTimeout(() => { document.title = "LOADED"; }, 3000);
});</script></body></html>`;

const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, deviceScaleFactor: 2 });
// A made-up local origin: the page and the design are served from memory.
await tab.route("http://builder.local/**", (route) => {
  const url = route.request().url();
  if (url.endsWith("/design.json")) return route.fulfill({ contentType: "application/json", body: design });
  return route.fulfill({ contentType: "text/html", body: page });
});
await tab.goto("http://builder.local/");
await tab.waitForFunction(() => document.title === "LOADED", null, { timeout: 60000 });
await tab.waitForTimeout(2500);
if (clickX && clickY) {
  await tab.mouse.click(Number(clickX), Number(clickY));
  await tab.waitForTimeout(1500);
}
await tab.screenshot({ path: join("docs", "builder.png") });
await browser.close();
console.log(`docs/builder.png: ${slug} in Unlayer's builder (${displayMode})`);
