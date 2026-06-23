import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "public");
const files = [
  "index.html",
  "app.js",
  "styles.css",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js"
];

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

await Promise.all(files.map((file) => cp(join(root, file), join(outDir, file))));

console.log("OiStop! static app built to public/");
