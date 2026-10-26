export async function readLimited(response, limit) {
  if (!response.ok) throw new Error(`HTTP ${response.status}: the image server denied or failed the request.`);
  if (Number(response.headers.get("content-length")) > limit) throw new Error("Image exceeds the 32 MB limit.");
  const reader = response.body.getReader(), chunks = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error("Image exceeds the 32 MB limit.");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
  return data;
}

export function imageOrigins(images) {
  return [...new Set(images.map(({url}) => {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Unsupported image URL.");
    // Chrome match patterns describe a host, without a port.
    return `${parsed.protocol}//${parsed.hostname}/*`;
  }))];
}
