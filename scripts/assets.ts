/**
 * The files a Canvas's image and a Document's PDF are drawn with. Nothing is fetched by the engines,
 * so this gives them as bytes, the way the Hyper Elements gallery's generator does:
 *
 * - each Google font the root's `fonts` prop names, as TTF (Satori and react-pdf don't read WOFF2),
 *   fetched once from Google Fonts and cached in .cache/fonts;
 * - each file in assets/, by the URL a design gives it: ASSET_BASE + its path.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/** Where designs say their images are. Images in assets/ are given at this URL. */
export const ASSET_BASE = process.env.ASSET_BASE ?? "https://hyperelements.dev/img";

const cache = resolve(".cache", "fonts");
/** The weights fetched for a font given as a range ("300 700"). */
const WEIGHTS = [300, 400, 500, 600, 700, 800];

type FontFace = { family: string; src: string; weight?: number | string; style?: string };
type FontFile = { family: string; src: Buffer; weight?: number; style?: "italic" };

/** A Google Fonts family at one weight and style, as TTF: from the cache, else fetched into it. */
async function googleFont(family: string, weight: number, italic: boolean): Promise<Buffer | null> {
  const file = join(cache, `${family.replace(/\W+/g, "-")}-${weight}${italic ? "-italic" : ""}.ttf`);
  try {
    return await readFile(file);
  } catch {}
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:ital,wght@${italic ? 1 : 0},${weight}`)).text();
  const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) return null;
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  await mkdir(cache, { recursive: true });
  await writeFile(file, bytes);
  return bytes;
}

/** The fonts a root names, as files the PDF and image engines read. */
export async function fontsFor(rootEl: { props?: { fonts?: FontFace[] } }): Promise<FontFile[]> {
  const fonts: FontFile[] = [];
  for (const f of rootEl?.props?.fonts ?? []) {
    if (!String(f.src).includes("fonts.gstatic.com")) continue;
    const [low, high] = String(f.weight ?? 400).split(/\s+/).map(Number);
    const italic = f.style === "italic";
    for (const weight of high ? WEIGHTS.filter((w) => w >= low && w <= high) : [low]) {
      const src = await googleFont(f.family, weight, italic);
      if (src) fonts.push({ family: f.family, src, weight, ...(italic ? { style: "italic" as const } : {}) });
    }
  }
  return fonts;
}

/** Every image in assets/, keyed by the URL designs give it. */
export async function imagesFor(root: string): Promise<Record<string, Buffer>> {
  const dir = join(root, "assets");
  const images: Record<string, Buffer> = {};
  let files: string[] = [];
  try {
    files = (await readdir(dir, { recursive: true })) as string[];
  } catch {
    return images;
  }
  for (const f of files) {
    if (!/\.(png|jpe?g|gif|svg)$/i.test(f)) continue;
    images[`${ASSET_BASE}/${f.split("\\").join("/")}`] = await readFile(join(dir, f));
  }
  return images;
}
