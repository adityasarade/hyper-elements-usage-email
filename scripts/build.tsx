/**
 * Renders every design in src/ the way the Hyper Elements template gallery does, into out/:
 *
 *   <slug>.html, <slug>.txt          the HTML and plain text render() writes (an Email or a Page also on a phone)
 *   <slug>.outline.txt               outline(): each block laid out, with its width
 *   <slug>.diagnostics.json          every diagnostic, with the email client checks
 *   <slug>.png                       a Canvas, drawn by renderImage()
 *   <slug>.pdf, <slug>-page-N.png    a Document, drawn by renderPdf(), and each page as an image
 *   <slug>-desktop.png, -phone.png   an Email or a Page, as a browser shows it
 *
 * Fonts are loaded as the gallery's own generator loads them: each Google font the root names, as TTF.
 * Exits 1 when a design has an error or a warning.
 *
 *   npm run build              every design in src/
 *   npm run build -- src/x.tsx one design
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { outline, render } from "@hyper-elements/react";
import { emailClients } from "@hyper-elements/email-clients";
import { fontsFor, imagesFor } from "./assets.ts";

type Diagnostic = { severity: string; code: string; message: string; path?: string };

const root = resolve(".");
const outDir = join(root, "out");
await mkdir(outDir, { recursive: true });

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const files = args.length ? args : (await readdir(join(root, "src"))).filter((f) => f.endsWith(".tsx")).map((f) => join("src", f));

let failed = false;
for (const file of files) {
  const mod = await import(pathToFileURL(resolve(file)).href);
  if (!mod.meta || typeof mod.default !== "function") continue;
  const slug = basename(file, ".tsx");
  const Example = mod.default;
  const element = <Example />;
  const rootEl = Example();
  const rootName: string = mod.meta.root;

  const { html, text, diagnostics } = await render(element, { plugins: [await emailClients()] });
  const all: Diagnostic[] = diagnostics.map(({ severity, code, message, path }: Diagnostic) => ({ severity, code, message, path }));
  await writeFile(join(outDir, `${slug}.html`), html);
  await writeFile(join(outDir, `${slug}.txt`), text);
  await writeFile(join(outDir, `${slug}.outline.txt`), outline(element));

  if (rootName === "Canvas" || rootName === "Document") {
    const fonts = await fontsFor(rootEl);
    const images = await imagesFor(root);
    if (rootName === "Canvas") {
      const { renderImage } = await import("@hyper-elements/react/image");
      const out = await renderImage(element, { fonts, images, scale: 1 });
      await writeFile(join(outDir, `${slug}.png`), out.image);
      all.push(...out.diagnostics.map(({ severity, code, message, path }: Diagnostic) => ({ severity, code, message, path })));
    } else {
      const { renderPdf } = await import("@hyper-elements/react/pdf");
      const out = await renderPdf(element, { fonts, images });
      const pdf = join(outDir, `${slug}.pdf`);
      await writeFile(pdf, out.pdf);
      all.push(...out.diagnostics.map(({ severity, code, message, path }: Diagnostic) => ({ severity, code, message, path })));
      try {
        execFileSync("pdftoppm", ["-png", "-r", "110", pdf, join(outDir, `${slug}-page`)]);
      } catch {
        console.log("  (pdftoppm not found: the PDF's pages aren't written as images)");
      }
    }
  } else {
    await writeFile(join(outDir, `${slug}.root`), rootName);
    try {
      await screenshots(slug, rootName);
    } catch {
      console.log(`  (no browser here: ../shots-watcher writes out/${slug}-desktop.png and -phone.png within a few seconds)`);
    }
  }

  await writeFile(join(outDir, `${slug}.diagnostics.json`), JSON.stringify(all, null, 2));
  const bad = all.filter((d) => d.severity === "error" || d.severity === "warning");
  const infos = all.length - bad.length;
  console.log(`${bad.length ? "✗" : "✓"} ${file} (${rootName}): ${bad.length} errors and warnings, ${infos} notes`);
  for (const d of bad) console.log(`    ${d.severity} ${d.code} at ${d.path}: ${d.message}`);
  if (process.argv.includes("--notes")) for (const d of all.filter((d) => !bad.includes(d))) console.log(`    ${d.severity} ${d.code} at ${d.path}: ${d.message}`);
  if (bad.length) failed = true;
}
process.exitCode = failed ? 1 : 0;

/** An Email or a Page in Chromium, on a desktop and on a phone, full length. */
async function screenshots(slug: string, rootName: string) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return console.log("  (playwright not installed: no screenshots)");
  }
  const browser = await chromium.launch();
  const file = pathToFileURL(join(outDir, `${slug}.html`)).href;
  const views: Array<[string, number, number]> = [
    ["desktop", rootName === "Page" ? 1280 : 760, 2],
    ["phone", 390, 3],
  ];
  for (const [name, width, scale] of views) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
    await page.goto(file, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(outDir, `${slug}-${name}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
}
