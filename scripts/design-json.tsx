/**
 * Writes the design as Unlayer builder design JSON (toDesign() from @hyper-elements/react/builder), for the
 * builder's loadDesign(), and prints what the builder can't hold as an editable tool.
 *
 *   npm run design-json
 */
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { toDesign } from "@hyper-elements/react/builder";

await mkdir("out", { recursive: true });
for (const file of (await readdir("src")).filter((f) => f.endsWith(".tsx"))) {
  const mod = await import(pathToFileURL(resolve("src", file)).href);
  if (!mod.meta) continue;
  const Example = mod.default;
  const { design, report } = toDesign(<Example />);
  const out = join("out", `${basename(file, ".tsx")}.design.json`);
  await writeFile(out, JSON.stringify(design, null, 2));
  console.log(`${out}: ${report.length} blocks the builder keeps as HTML or hidden properties`);
  for (const line of report) console.log(`  ${line}`);
}
