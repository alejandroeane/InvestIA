export async function fetchBounded(url, options = {}, timeoutMs = 15000, maxBytes = 3_000_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    const len = Number(res.headers.get('content-length'));
    if (len && len > maxBytes) throw new Error('Remote response exceeds size limit');
    if (!res.body) return '';
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new Error('Remote response exceeds size limit'); }
      chunks.push(value);
    }
    const data = new Uint8Array(size);
    let pos = 0;
    for (const part of chunks) { data.set(part, pos); pos += part.byteLength; }
    return new TextDecoder().decode(data);
  } finally { clearTimeout(timer); }
}
export async function fetchJson(url, options = {}, timeoutMs = 15000, maxBytes = 3_000_000) {
  return JSON.parse(await fetchBounded(url, options, timeoutMs, maxBytes));
}
