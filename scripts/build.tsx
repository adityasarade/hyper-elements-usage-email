/** Render the gallery email and values examples, with plain text and desktop/phone screenshots. */
import { spawnSync } from "node:child_process";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { outline, render, type Diagnostic } from "@hyper-elements/react";
import { emailClients } from "@hyper-elements/email-clients";

const outDir = resolve("out");
await mkdir(outDir, { recursive: true });

const args = process.argv.slice(2).filter((arg) => arg !== "--notes");
const files = args.length ? args : [
  ...(await readdir("src")).filter((file) => file.endsWith(".tsx")).map((file) => join("src", file)),
  ...(await readdir("designs")).filter((file) => file.endsWith(".values.json")).map((file) => join("designs", file)),
];

const renderedSlugs: string[] = [];
let failed = false;
for (const file of files) {
  const fromValues = file.endsWith(".values.json");
  const slug = basename(file, fromValues ? ".values.json" : ".tsx");
  let diagnostics: Diagnostic[];
  if (fromValues) {
    // Use the CLI so values go through template and rules checks before rendering.
    const require = createRequire(import.meta.url);
    const cliManifest = require.resolve("@hyper-elements/cli/package.json");
    const cli = resolve(dirname(cliManifest), require(cliManifest).bin["hyper-elements"]);
    const result = spawnSync(process.execPath, [cli, "render", file, "--base", dirname(file), "--out", outDir, "--json"], { encoding: "utf8" });
    if (result.error) throw result.error;
    if (result.stderr) process.stderr.write(result.stderr);
    const records = result.stdout.trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
    const report = records.find((record) => record.file);
    if (result.status !== 0 || report?.status !== "ok") {
      console.error(`✗ ${file}: ${result.stdout.trim() || "The CLI did not render this design."}`);
      failed = true;
      continue;
    }
    diagnostics = report.diagnostics;
  } else {
    const mod = await import(pathToFileURL(resolve(file)).href);
    if (mod.meta?.root !== "Email" || typeof mod.default !== "function") {
      throw new Error(`${file} needs an Email meta export and a default design component.`);
    }
    const Example = mod.default;
    const email = <Example />;
    const rendered = await render(email, { plugins: [await emailClients()] });
    diagnostics = rendered.diagnostics;
    await writeFile(join(outDir, `${slug}.html`), rendered.html);
    await writeFile(join(outDir, `${slug}.txt`), rendered.text);
    await writeFile(join(outDir, `${slug}.outline.txt`), outline(email));
  }

  renderedSlugs.push(slug);
  await writeFile(join(outDir, `${slug}.root`), "Email");
  await writeFile(join(outDir, `${slug}.diagnostics.json`), JSON.stringify(diagnostics, null, 2));
  const problems = diagnostics.filter(({ severity }) => severity === "error" || severity === "warning");
  const notes = diagnostics.length - problems.length;
  console.log(`${problems.length ? "✗" : "✓"} ${file} (Email): ${problems.length} errors and warnings, ${notes} notes`);
  for (const diagnostic of process.argv.includes("--notes") ? diagnostics : problems) {
    console.log(`    ${diagnostic.severity} ${diagnostic.code} at ${diagnostic.path}: ${diagnostic.message}`);
  }
  if (problems.length) failed = true;
}

try {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const slug of renderedSlugs) {
      for (const [name, width, scale] of [["desktop", 760, 2], ["phone", 390, 3]] as const) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale });
        try {
          await page.goto(pathToFileURL(join(outDir, `${slug}.html`)).href, { waitUntil: "networkidle" });
          await page.screenshot({ path: join(outDir, `${slug}-${name}.png`), fullPage: true });
        } finally {
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
} catch (error) {
  console.log(`  (screenshots unavailable in this process: ${String(error).split("\n")[0]})`);
}
process.exitCode = failed ? 1 : 0;
