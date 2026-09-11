import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const ROOT = "/home/claude/fototeca-platform";

// [source stem in uploads dir, sourceDir, output slug, display name]
const tkanevaya = [
  ["ASH", "Ash"],
  ["BAHAMA GRAY", "Bahama Gray"],
  ["BAHAMA ROSE", "Bahama Rose"],
  ["BEIGE", "Beige"],
  ["CEMENT", "Cement"],
  ["CHOCO", "Choco"],
  ["coral", "Coral"],
  ["DIMROSE", "Dimrose"],
  ["FUCSIA", "Fucsia"],
  ["GRAFIT", "Grafit"],
  ["LAGUNA", "Laguna"],
  ["LATTE", "Latte"],
  ["LIME", "Lime"],
  ["MOCCA", "Mocca"],
  ["ORANGE", "Orange"],
  ["SAND", "Sand"],
  ["TURQUOISE", "Turquoise"],
];

const ekokozha = [
  "A1","A2","A4","A5","A6","A7","A8","A9","A10","A11","A12","A13","A14",
  "A22","A23","A31","A32","A33","A34","A35","A36","A37","A39","A40",
  "B5","D7","D8","N2","N3","N15","N16","N18","P8",
].map((code) => [code, code]);

function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

async function processOne(srcPath, outPath) {
  await sharp(srcPath)
    .resize({ width: 700, height: 700, fit: "cover" })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(outPath);
  return fs.statSync(outPath).size;
}

const results = { tkanevaya: [], ekokozha: [] };

for (const [stem, displayName] of tkanevaya) {
  const src = path.join(ROOT, "..", "uploads-src-placeholder"); // unused
}

const uploadsBase = "/mnt/user-data/uploads";

for (const [stem, displayName] of tkanevaya) {
  const src = path.join(uploadsBase, "ткань", `${stem}.jpg`);
  const slug = slugify(displayName);
  const out = path.join(ROOT, "public/cover-swatches/tkanevaya", `${slug}.jpg`);
  const size = await processOne(src, out);
  results.tkanevaya.push({ name: displayName, slug, size, url: `/cover-swatches/tkanevaya/${slug}.jpg` });
}

for (const [stem, displayName] of ekokozha) {
  const src = path.join(uploadsBase, "для системы/эко-кожа", `${stem}.jpg`);
  const slug = slugify(displayName);
  const out = path.join(ROOT, "public/cover-swatches/ekokozha", `${slug}.jpg`);
  const size = await processOne(src, out);
  results.ekokozha.push({ name: displayName, slug, size, url: `/cover-swatches/ekokozha/${slug}.jpg` });
}

fs.writeFileSync("/tmp/swatch-results.json", JSON.stringify(results, null, 2));
console.log("tkanevaya:", results.tkanevaya.length, "ekokozha:", results.ekokozha.length);
