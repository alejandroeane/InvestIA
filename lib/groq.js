import { fetchJson } from './http.js';
export async function complete({ model='openai/gpt-oss-20b', messages, max=650, schema }) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');
  const req = { model, messages, max_completion_tokens:max, reasoning_effort:'low', include_reasoning:false };
  if (schema) req.response_format = { type:'json_schema', json_schema:{ name:'investia_route', strict:true, schema } };
  const r = await fetchJson('https://api.groq.com/openai/v1/chat/completions', {
    method:'POST', headers:{ Authorization:`Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify(req)
  }, 35000, 200_000);
  return r.choices?.[0]?.message?.content?.trim() || '';
}
