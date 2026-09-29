import * as cheerio from 'cheerio';
import { fetchBounded, fetchJson } from './http.js';

function secHeaders() {
  if (!process.env.SEC_USER_AGENT || !process.env.SEC_USER_AGENT.includes('@')) throw new Error('SEC_USER_AGENT missing or invalid');
  return { 'User-Agent': process.env.SEC_USER_AGENT, Accept: 'application/json, text/html;q=0.9' };
}
export async function latestFilings(company) {
  const cik = String(company.cik).padStart(10, '0');
  const data = await fetchJson(`https://data.sec.gov/submissions/CIK${cik}.json`, { headers: secHeaders() }, 18000, 2_500_000);
  const recent = data.filings?.recent || {};
  const result = [];
  for (let i = 0; i < (recent.form?.length || 0); i++) {
    if (!['10-Q', '10-K'].includes(recent.form[i])) continue;
    const accession = recent.accessionNumber[i];
    const primary = recent.primaryDocument[i];
    if (!/^\d{10}-\d{2}-\d{6}$/.test(accession) || !/^[\w.-]+\.html?$/i.test(primary)) continue;
    result.push({
      ticker: company.ticker, name: company.name, sector: company.sector,
      form: recent.form[i], filed: recent.filingDate[i], period: recent.reportDate[i], accession,
      url: `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accession.replace(/-/g, '')}/${primary}`
    });
    if (result.length >= 2) break;
  }
  return result;
}
function normalizeText(text) { return (text || '').replace(/\u00a0/g, ' ').replace(/[\t\r ]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim(); }
export async function filingChunks(filing) {
  const html = await fetchBounded(filing.url, { headers: secHeaders() }, 22000, 6_000_000);
  const $ = cheerio.load(html);
  $('script,style,noscript,nav,svg,ix\\:header,ix\\:hidden').remove();
  $('table').each((_, table) => {
    const rows = $(table).find('tr').slice(0, 90).map((__, row) => {
      const cells = $(row).find('th,td').map((___, cell) => normalizeText($(cell).text()).slice(0, 170)).get().filter(Boolean);
      return cells.join(' | ');
    }).get().filter(Boolean);
    $(table).replaceWith(`\n${rows.join('\n')}\n`);
  });
  const text = normalizeText(($('body').length ? $('body') : $.root()).text());
  if (text.length < 3000) throw new Error('Filing text could not be extracted');
  const blocks = text.split(/\n\s*\n/).map(s => normalizeText(s)).filter(s => s.length > 75);
  const chunks = [];
  let current = '';
  const add = s => { if (s.length >= 140) chunks.push(s.slice(0, 1100)); };
  for (const block of blocks) {
    const pieces = block.match(/[\s\S]{1,850}(?:\s|$)/g) || [block];
    for (let part of pieces) {
      part = part.trim();
      if (!part) continue;
      if ((current + ' ' + part).length > 950) { add(current); current = ''; }
      current += (current ? ' ' : '') + part;
      if (chunks.length >= 42) break;
    }
    if (chunks.length >= 42) break;
  }
  add(current);
  return chunks.slice(0, 42);
}
