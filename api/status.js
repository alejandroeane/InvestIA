import { companies } from '../lib/config.js';
import { latestIndexed } from '../lib/qdrant.js';
export default async function handler(req,res) {
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  res.setHeader('Cache-Control','public, s-maxage=300');
  try {
    const covered=[];
    for(const c of companies){ const f=await latestIndexed(c.ticker); if(f) covered.push({ticker:c.ticker,name:c.name,sector:c.sector,period:f.period,filed:f.filed,form:f.form}); }
    return res.status(200).json({covered,planned:companies.length,source:'SEC EDGAR'});
  }catch(e){console.error('Status error',e);return res.status(503).json({error:'Index unavailable'});}
}
