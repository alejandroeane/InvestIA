import { companies } from '../lib/config.js';
import { latestFilings, filingChunks } from '../lib/sec.js';
import { ensureCollection, existingFiling, storeFiling } from '../lib/qdrant.js';
export const maxDuration = 300;
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({error:'Unauthorized'});
  try {
    await ensureCollection();
    const updated = [], errors=[];
    for (const company of companies) {
      try {
        const filings = await latestFilings(company);
        for (const filing of filings) {
          if (await existingFiling(filing.accession)) continue;
          const chunks = await filingChunks(filing);
          if (chunks.length < 3) throw new Error('Insufficient text extracted');
          await storeFiling(filing,chunks);
          updated.push(`${company.ticker} ${filing.form} ${filing.period} (${chunks.length} passages)`);
        }
      } catch(e) { errors.push(`${company.ticker}: ${e.message}`); }
    }
    return res.status(errors.length?207:200).json({updated,errors});
  } catch(e) { console.error('Sync failed',e); return res.status(503).json({error:'Synchronization failed; check logs'}); }
}
