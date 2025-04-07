import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skills = JSON.parse(readFileSync(join(__dirname, "skills.json"), "utf-8"));
const imagesDir = join(__dirname, "images");
if (!existsSync(imagesDir)) {
  mkdirSync(imagesDir, { recursive: true });
}

async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    const filePath = join(imagesDir, filename);
    writeFileSync(filePath, Buffer.from(buffer));
    console.log(`Downloaded: ${filename}`);
  } catch (error) {
    console.error(`Failed to download ${filename}:`, error.message);
  }
}

async function downloadAllImages() {
  console.log("Starting image downloads...");

  for (const skill of skills.slice(0, 5)) {
    const filename = `${skill.skillId}.svg`;
    await downloadImage(skill.imgSrc, filename);
  }

  console.log("All downloads completed!");
}

downloadAllImages().catch(console.error);
