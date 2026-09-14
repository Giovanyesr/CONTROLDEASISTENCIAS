const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '..', 'public', 'logo.png');

async function generar() {
  const img = sharp(src);

  // Recortar al cuadrado central (1024x1024 desde el centro)
  const cuadrado = img.resize(1024, 1024, { fit: 'cover', position: 'centre' });

  await cuadrado.clone().resize(512, 512).png().toFile(path.join(__dirname, '..', 'public', 'icons', 'icon-512.png'));
  await cuadrado.clone().resize(192, 192).png().toFile(path.join(__dirname, '..', 'public', 'icons', 'icon-192.png'));
  await cuadrado.clone().resize(180, 180).png().toFile(path.join(__dirname, '..', 'public', 'icons', 'apple-touch-icon.png'));

  console.log('Iconos generados correctamente');
}

generar().catch((e) => { console.error(e); process.exit(1); });