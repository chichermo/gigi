/**
 * Genera PNGs para PWA desde el SVG (requiere sharp).
 * Si no está instalado, los iconos SVG siguen funcionando en navegador.
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Instala sharp para generar PNGs: npm install sharp');
    createPlaceholderPngs();
    return;
  }

  const svgPath = path.join(__dirname, '..', 'icons', 'icon.svg');
  const svg = fs.readFileSync(svgPath);

  for (const size of [192, 512]) {
    const out = path.join(__dirname, '..', 'icons', `icon-${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`Generado: icon-${size}.png`);
  }
}

function createPlaceholderPngs() {
  const iconsDir = path.join(__dirname, '..', 'icons');
  const minimalPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  for (const size of [192, 512]) {
    fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), minimalPng);
  }
  console.log('Placeholders PNG creados. Ejecuta: npm install sharp && npm run icons');
}

main().catch(console.error);
