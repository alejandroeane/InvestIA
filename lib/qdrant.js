import { createHash } from 'node:crypto';
import { collection, embedModel, embedDimension } from './config.js';
import { fetchJson } from './http.js';
function base() {
  const raw = process.env.QDRANT_URL;
  if (!raw || !process.env.QDRANT_API_KEY) throw new Error('Qdrant configuration missing');
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error('Qdrant URL must use HTTPS');
  return url.origin;
}
async function call(path, method = 'GET', data) {
  const url = `${base()}${path}`;
  return fetchJson(url, { method, headers: { 'Content-Type':'application/json', 'api-key': process.env.QDRANT_API_KEY }, ...(data ? { body: JSON.stringify(data) } : {}) }, 30000, 2_000_000);
}
export async function ensureCollection() {
  const url = `${base()}/collections/${collection}`;
  const r = await fetch(url, {
    headers: { "api-key": process.env.QDRANT_API_KEY }
  });

  if (r.status === 404) {
    const made = await call(
      `/collections/${collection}`,
      "PUT",
      { vectors: { size: embedDimension, distance: "Cosine" } }
    );
    if (!made.result) {
      throw new Error("Qdrant collection creation failed");
    }
  } else if (!r.ok) {
    throw new Error(`Qdrant collection check HTTP ${r.status}`);
  }

  for (const field of ["ticker", "accession"]) {
    await call(
      `/collections/${collection}/index?wait=true`,
      "PUT",
      { field_name: field, field_schema: "keyword" }
    );
  }
}
export async function existingFiling(accession) {
  const r = await call(`/collections/${collection}/points/scroll`, 'POST', { limit: 1, with_payload: true, with_vector: false, filter: { must: [ { key:'accession', match:{ value: accession } } ] } });
  return Boolean(r.result?.points?.length);
}
function uuid(seed) {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
}
export async function storeFiling(filing, chunks) {
  for (let i = 0; i < chunks.length; i += 8) {
    const points = chunks.slice(i, i+8).map((text, j) => ({
      id: uuid(`${filing.accession}:${i+j}`),
      vector: { text: text.slice(0, 900), model: embedModel },
      payload: { ...filing, text, chunk: i+j }
    }));
    await call(`/collections/${collection}/points?wait=true`, 'PUT', { points });
  }
}
export async function searchCompany(ticker, query, limit=4) {
  const r = await call(`/collections/${collection}/points/query`, 'POST', {
    query: { text: query.slice(0, 500), model: embedModel },
    filter: { must: [{ key: 'ticker', match: { value: ticker } }] },
    with_payload: true, limit
  });
  return (r.result?.points || []).map(p => p.payload).filter(p => p?.text && /^https:\/\/www\.sec\.gov\/Archives\//.test(p.url));
}
export async function latestIndexed(ticker) {
  const r = await call(`/collections/${collection}/points/scroll`, 'POST', {
    filter: { must: [{ key: 'ticker', match: { value: ticker } }] },
    limit: 100, with_payload: ['ticker','period','filed','form','accession','url'], with_vector:false
  });
  const items = r.result?.points?.map(p=>p.payload).filter(Boolean) || [];
  items.sort((a,b)=>String(b.filed).localeCompare(String(a.filed)));
  return items[0] || null;
}
