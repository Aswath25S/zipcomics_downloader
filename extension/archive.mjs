// Standalone ZIP and RAR5 "store" writers. No compression code or remote libraries.
// RAR5 structures: https://www.rarlab.com/technote.htm
const encoder = new TextEncoder();
const table = Uint32Array.from({length: 256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

export function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = table[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function vint(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid archive size.");
  const bytes = [];
  do {
    let byte = value % 128;
    value = Math.floor(value / 128);
    if (value) byte |= 128;
    bytes.push(byte);
  } while (value);
  return new Uint8Array(bytes);
}

function concat(...parts) {
  const data = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { data.set(part, offset); offset += part.length; }
  return data;
}

function rarHeader(fields) {
  const content = concat(vint(fields.length), fields);
  return concat(u32(crc32(content)), content);
}

function validateEntries(entries) {
  if (!entries.length || entries.length > 65535) throw new Error("Select between 1 and 65,535 pages.");
  const names = new Set();
  for (const {name, data} of entries) {
    if (!name || /[\\/\x00]/.test(name) || name === "." || name === ".." || encoder.encode(name).length > 65535) {
      throw new Error("Invalid archive filename.");
    }
    if (names.has(name)) throw new Error("Duplicate archive filename.");
    names.add(name);
    if (!(data instanceof Uint8Array) || data.length > 0xffffffff) throw new Error("Invalid archive data.");
  }
}

function rar(entries) {
  const parts = [new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 7, 1, 0]),
    rarHeader(new Uint8Array([1, 0, 0]))];
  for (const {name, data} of entries) {
    const filename = encoder.encode(name);
    // File header, data present, CRC32 present, Unix regular file, store method.
    const fields = concat(vint(2), vint(2), vint(data.length), vint(4), vint(data.length),
      vint(0o100644), u32(crc32(data)), vint(0), vint(1), vint(filename.length), filename);
    parts.push(rarHeader(fields), data);
  }
  parts.push(rarHeader(new Uint8Array([5, 0, 0])));
  return new Blob(parts, {type: "application/vnd.rar"});
}

function zip(entries) {
  const parts = [], directory = [];
  let offset = 0;
  for (const {name, data} of entries) {
    const filename = encoder.encode(name), crc = crc32(data);
    const local = new Uint8Array(30), view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0x800, true); // UTF-8 filenames.
    view.setUint16(12, 0x21, true); // 1980-01-01 DOS date.
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, filename.length, true);
    const central = new Uint8Array(46), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x800, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, filename.length, true);
    cv.setUint32(42, offset, true);
    parts.push(local, filename, data);
    directory.push(central, filename);
    offset += local.length + filename.length + data.length;
    if (offset > 0xffffffff) throw new Error("Archive exceeds ZIP32 limits.");
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, directorySize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...directory, end], {type: "application/vnd.comicbook+zip"});
}

export function createArchive(entries, format) {
  validateEntries(entries);
  if (format === "cbr") return rar(entries);
  if (format === "cbz") return zip(entries);
  throw new Error("Unsupported archive format.");
}

export function imageExtension(data) {
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return "jpg";
  const ascii = (start, end) => String.fromCharCode(...data.slice(start, end));
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => data[i] === byte)) return "png";
  if (["GIF87a", "GIF89a"].includes(ascii(0, 6))) return "gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  throw new Error("The server returned an error page or an unsupported image format.");
}

export function safeName(title) {
  return title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim().replace(/[. ]+$/, "").slice(0, 140) || "comic";
}
