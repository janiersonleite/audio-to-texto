// Gera ícones PNG para o PWA sem dependências externas
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = t[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

function makePNG(size) {
  const BG  = [26, 26, 46];   // #1a1a2e
  const PUR = [108, 99, 255]; // #6c63ff
  const WHT = [255, 255, 255];

  const pixels = [];
  const cx = size / 2, cy = size / 2, r = size * 0.42;

  for (let y = 0; y < size; y++) {
    pixels.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let col;
      if (dist > r) {
        col = BG;
      } else if (dist > r - size * 0.03) {
        // borda suave
        const t = (dist - (r - size * 0.03)) / (size * 0.03);
        col = BG.map((b, i) => Math.round(b * t + PUR[i] * (1 - t)));
      } else {
        col = PUR;
      }

      // microfone simples em branco
      const nx = dx / r, ny = dy / r; // coordenadas normalizadas -1..1

      // Corpo do mic: retângulo arredondado estreito no centro superior
      const inMicBody =
        Math.abs(nx) < 0.13 && ny > -0.55 && ny < 0.12 &&
        !(Math.abs(nx) < 0.13 && ny > -0.55 && ny < 0.12 &&
          (nx * nx + (ny + 0.55) * (ny + 0.55)) > 0.013 * 4 && ny < -0.42);

      // Arco do suporte
      const arcDist = Math.sqrt(nx * nx + (ny - 0.12) * (ny - 0.12));
      const inArc = arcDist > 0.28 && arcDist < 0.42 && ny < 0.12;

      // Haste vertical
      const inStem = Math.abs(nx) < 0.045 && ny > 0.12 && ny < 0.42;

      // Base
      const inBase = Math.abs(nx) < 0.18 && ny > 0.38 && ny < 0.47;

      if (inMicBody || inArc || inStem || inBase) col = WHT;

      pixels.push(...col);
    }
  }

  const raw  = Buffer.from(pixels);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const out = path.join(__dirname, 'icons', `icon-${size}.png`);
  fs.writeFileSync(out, makePNG(size));
  console.log(`✅ icons/icon-${size}.png`);
}
