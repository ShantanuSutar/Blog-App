const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF87A = Buffer.from("GIF87a", "ascii");
const GIF89A = Buffer.from("GIF89a", "ascii");

const imageTypes = Object.freeze({
  jpeg: Object.freeze({ mimeType: "image/jpeg", extension: ".jpg", inputExtensions: [".jpg", ".jpeg"] }),
  png: Object.freeze({ mimeType: "image/png", extension: ".png", inputExtensions: [".png"] }),
  webp: Object.freeze({ mimeType: "image/webp", extension: ".webp", inputExtensions: [".webp"] }),
  gif: Object.freeze({ mimeType: "image/gif", extension: ".gif", inputExtensions: [".gif"] }),
});

const readJpegDimensions = (buffer) => {
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    if (
      (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (segmentLength < 7) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  return null;
};

const readWebpDimensions = (buffer) => {
  const subtype = buffer.toString("ascii", 12, 16);
  if (subtype === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (subtype === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: 1 + (bits & 0x3fff),
      height: 1 + ((bits >> 14) & 0x3fff),
    };
  }
  if (subtype === "VP8 " && buffer.length >= 30) {
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) return null;
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  return null;
};

export const detectImageFile = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 10) return null;

  if (
    buffer.length >= 24
    && buffer.subarray(0, 8).equals(PNG_SIGNATURE)
    && buffer.toString("ascii", 12, 16) === "IHDR"
    && buffer.length >= 12
    && buffer.readUInt32BE(buffer.length - 12) === 0
    && buffer.toString("ascii", buffer.length - 8, buffer.length - 4) === "IEND"
  ) {
    return {
      ...imageTypes.png,
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (
    buffer.length >= 10
    && (buffer.subarray(0, 6).equals(GIF87A) || buffer.subarray(0, 6).equals(GIF89A))
    && buffer[buffer.length - 1] === 0x3b
  ) {
    return {
      ...imageTypes.gif,
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  if (
    buffer.length >= 20
    && buffer.toString("ascii", 0, 4) === "RIFF"
    && buffer.toString("ascii", 8, 12) === "WEBP"
    && buffer.readUInt32LE(4) + 8 === buffer.length
  ) {
    const dimensions = readWebpDimensions(buffer);
    return dimensions ? { ...imageTypes.webp, ...dimensions } : null;
  }

  if (
    buffer.length >= 4
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[buffer.length - 2] === 0xff
    && buffer[buffer.length - 1] === 0xd9
  ) {
    const dimensions = readJpegDimensions(buffer);
    return dimensions ? { ...imageTypes.jpeg, ...dimensions } : null;
  }

  return null;
};

export const acceptedImageTypes = imageTypes;
