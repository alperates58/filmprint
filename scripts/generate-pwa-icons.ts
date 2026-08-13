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

function generateFilmprintPng(width: number, height: number, isMaskable = false): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // Raw pixel data: 1 byte filter (0) per scanline + width * 4 bytes
  const scanlineSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineSize);

  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = Math.min(width, height) * (isMaskable ? 0.35 : 0.4);
  const innerRadius = outerRadius * 0.45;
  const coreRadius = innerRadius * 0.45;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineSize;
    rawData[rowOffset] = 0; // None filter

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Dark #09090b (9, 9, 11)
      let r = 9;
      let g = 9;
      let b = 11;
      let a = 255;

      if (dist <= coreRadius) {
        // Core glowing dot: #e50914 (229, 9, 20)
        r = 229;
        g = 9;
        b = 20;
      } else if (dist <= innerRadius) {
        // Inner accent ring background
        r = 24;
        g = 24;
        b = 31;
      } else if (dist <= outerRadius) {
        // Outer accent border #e50914 with opacity / glow
        const ringFactor = (dist - innerRadius) / (outerRadius - innerRadius);
        r = Math.round(229 * (1 - ringFactor * 0.4));
        g = Math.round(9 * (1 - ringFactor * 0.4));
        b = Math.round(20 * (1 - ringFactor * 0.4));
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
    const pngBuf = generateFilmprintPng(target.width, target.height, target.maskable);
    fs.writeFileSync(target.filePath, pngBuf);
    console.log(`Generated: ${target.filePath} (${target.width}x${target.height})`);
  }
}

if (require.main === module) {
  generateAllIcons();
}
