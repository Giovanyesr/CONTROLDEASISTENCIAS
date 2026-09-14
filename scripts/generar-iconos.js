const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'logo.png');

async function generar() {
  // Recortar la transparencia para aislar el escudo real
  const base = sharp(src).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } });

  const sizes = [
    { file: 'icon-192.png', side: 192 },
    { file: 'icon-512.png', side: 512 },
    { file: 'apple-touch-icon.png', side: 180 },
  ];

  for (const { file, side } of sizes) {
    // Lienzo cuadrado con fondo blanco; el escudo centrado ocupa ~72% y se ve completo
    const contenido = Math.round(side * 0.72);
    const padding = side - contenido;
    const top = Math.floor(padding / 2);
    const bottom = padding - top;
    const left = Math.floor(padding / 2);
    const right = padding - left;

    await base
      .clone()
      .resize(contenido, contenido, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .extend({
        top, bottom, left, right,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .flatten({ background: '#ffffff' })
      .png()
      .toFile(path.join(__dirname, '..', 'public', 'icons', file));
  }

  console.log('Iconos generados correctamente');
}

generar().catch((e) => { console.error(e); process.exit(1); });