export const collection = 'investia_filings_v1';
export const embedModel = process.env.QDRANT_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
export const embedDimension = Number(process.env.QDRANT_DIMENSION || 384);
export const companies = [
  { ticker: 'AAPL', cik: 320193, name: 'Apple', aliases: ['Apple Inc'], sector: 'technology' },
  { ticker: 'MSFT', cik: 789019, name: 'Microsoft', aliases: ['Microsoft Corporation'], sector: 'technology' },
  { ticker: 'NVDA', cik: 1045810, name: 'NVIDIA', aliases: ['Nvidia Corporation'], sector: 'technology' },
  { ticker: 'GOOGL', cik: 1652044, name: 'Alphabet', aliases: ['Google','GOOG'], sector: 'technology' },
  { ticker: 'AMZN', cik: 1018724, name: 'Amazon', aliases: ['Amazon.com'], sector: 'consumer' },
  { ticker: 'WMT', cik: 104169, name: 'Walmart', aliases: ['Wal-Mart'], sector: 'consumer' },
  { ticker: 'JPM', cik: 19617, name: 'JPMorgan Chase', aliases: ['JP Morgan','Chase'], sector: 'financials' },
  { ticker: 'BAC', cik: 70858, name: 'Bank of America', aliases: ['BofA'], sector: 'financials' },
  { ticker: 'XOM', cik: 34088, name: 'Exxon Mobil', aliases: ['Exxon'], sector: 'energy' },
  { ticker: 'CVX', cik: 93410, name: 'Chevron', aliases: [], sector: 'energy' }
];
export const sectors = {
  technology: ['technology','tech','tecnología','tecnologia','tecnológico','tecnologico','tecnológicas','tecnologicas','software','semiconductors','semiconductores'],
  financials: ['financials','finance','financial','banks','banking','bancos','banca','financiero','financiera','finanzas'],
  consumer: ['consumer','retail','consumo','minoristas','comercio','comercio minorista'],
  energy: ['energy','oil','gas','energía','energia','petróleo','petroleo']
};
