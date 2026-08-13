import fs from "fs";
import path from "path";
import zlib from "zlib";

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crcBuf]);
}

function generateCinemaIconPng(width: number, height: number, isMaskable = false): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = makeChunk("IHDR", ihdrData);

  const scanlineSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineSize);

  const centerX = width / 2;
  const centerY = height / 2;
  const scale = (Math.min(width, height) / 2) * (isMaskable ? 0.75 : 0.85);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineSize;
    rawData[rowOffset] = 0;

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const nx = (x - centerX) / scale;
      const ny = (y - centerY) / scale;

      let r = 9;
      let g = 9;
      let b = 11;
      let a = 255;

      const distFromCenter = Math.sqrt(nx * nx + ny * ny);
      if (distFromCenter < 1.2) {
        const glow = (1 - distFromCenter / 1.2) * 0.15;
        r = Math.min(255, Math.round(r + 229 * glow));
        g = Math.min(255, Math.round(g + 9 * glow));
        b = Math.min(255, Math.round(b + 20 * glow));
      }

      const absNx = Math.abs(nx);
      const absNy = Math.abs(ny);
      const squircleDist = Math.pow(absNx, 4) + Math.pow(absNy, 4);

      if (squircleDist <= 0.85) {
        r = 18;
        g = 18;
        b = 22;

        if (squircleDist >= 0.78) {
          r = 229;
          g = 9;
          b = 20;
        }

        if (nx >= -0.42 && nx <= 0.42 && ny >= -0.02 && ny <= 0.48) {
          r = 24;
          g = 24;
          b = 31;

          if (nx <= -0.39 || nx >= 0.39 || ny >= 0.45) {
            r = 229;
            g = 9;
            b = 20;
          }

          if ((nx >= -0.36 && nx <= -0.30) || (nx >= 0.30 && nx <= 0.36)) {
            if ((ny >= 0.05 && ny <= 0.13) || (ny >= 0.20 && ny <= 0.28) || (ny >= 0.35 && ny <= 0.43)) {
              r = 9;
              g = 9;
              b = 11;
            }
          }

          const triY = ny - 0.23;
          const triX = nx + 0.12;
          if (triX >= 0 && triX <= 0.28) {
            const halfHeight = (0.28 - triX) * 0.53;
            if (triY >= -halfHeight && triY <= halfHeight) {
              r = 229;
              g = 9;
              b = 20;
            }
          }
        }

        if (nx >= -0.42 && nx <= 0.42 && ny >= -0.14 && ny <= -0.04) {
          const stripe = Math.floor((nx + ny * 0.5 + 10) * 12) % 2;
          if (stripe === 0) {
            r = 229;
            g = 9;
            b = 20;
          } else {
            r = 244;
            g = 244;
            b = 245;
          }
        }

        const pivotX = -0.4;
        const pivotY = -0.15;
        const angle = -0.32;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const rx = cosA * (nx - pivotX) - sinA * (ny - pivotY) + pivotX;
        const ry = sinA * (nx - pivotX) + cosA * (ny - pivotY) + pivotY;

        if (rx >= -0.42 && rx <= 0.42 && ry >= -0.26 && ry <= -0.16) {
          const stripe = Math.floor((rx + ry * 0.5 + 10) * 12) % 2;
          if (stripe === 0) {
            r = 229;
            g = 9;
            b = 20;
          } else {
            r = 244;
            g = 244;
            b = 245;
          }
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idat = makeChunk("IDAT", compressedData);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

export function generateAllIcons() {
  const iconsDir = path.join(process.cwd(), "public", "icons");
  const publicDir = path.join(process.cwd(), "public");

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const targets = [
    { filePath: path.join(iconsDir, "icon-192.png"), width: 192, height: 192, maskable: false },
    { filePath: path.join(iconsDir, "icon-192-maskable.png"), width: 192, height: 192, maskable: true },
    { filePath: path.join(iconsDir, "icon-512.png"), width: 512, height: 512, maskable: false },
    { filePath: path.join(iconsDir, "icon-512-maskable.png"), width: 512, height: 512, maskable: true },
    { filePath: path.join(publicDir, "apple-touch-icon.png"), width: 180, height: 180, maskable: false },
  ];

  for (const target of targets) {
    const pngBuf = generateCinemaIconPng(target.width, target.height, target.maskable);
    fs.writeFileSync(target.filePath, pngBuf);
    console.log(`Generated Cinema Icon: ${target.filePath} (${target.width}x${target.height})`);
  }
}

if (require.main === module) {
  generateAllIcons();
}
