// Vercel serverless function: read medicine photos and extract a structured
// inventory (name, expiry, category) using OpenAI vision. The key stays
// server-side (OPENAI_API_KEY). The client sends one or more image data URLs;
// the model returns { medicines: [...] } which the user then confirms.

const CATEGORIES = ['pain', 'cold', 'allergy', 'stomach', 'firstaid', 'kids', 'prescription', 'other'];

const SYSTEM_PROMPT =
  'You catalog a household medicine cabinet from photos. Identify each distinct medicine, ' +
  'supplement or first-aid product visible across the given images. ' +
  'For each item return: name (the product/brand name as printed), ' +
  'expiry as "YYYY-MM" if an expiry/EXP/"use by"/"годен до" date is visible (else empty string), ' +
  'and category, one of: pain, cold, allergy, stomach, firstaid, kids, prescription, other. ' +
  'If several photos clearly show the same package (e.g. front and the expiry side), merge them into one item. ' +
  'Ignore anything that is not a medicine/supplement. ' +
  'Respond ONLY as JSON: {"medicines":[{"name":"","expiry":"","category":""}]}.';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const images = Array.isArray(body.images) ? body.images.filter((s) => typeof s === 'string' && s.startsWith('data:')) : [];
    if (images.length === 0) return res.status(400).json({ error: 'Send at least one photo.' });

    const content = [
      { type: 'text', text: 'Extract the medicines from these photos.' },
      ...images.slice(0, 8).map((url) => ({ type: 'image_url', image_url: { url, detail: 'high' } })),
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content },
        ],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      const message = (data && data.error && data.error.message) || 'Recognition failed.';
      return res.status(r.status).json({ error: message });
    }
    let parsed = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      parsed = {};
    }
    const medicines = (Array.isArray(parsed.medicines) ? parsed.medicines : [])
      .map((item) => ({
        name: String(item?.name || '').slice(0, 120).trim(),
        expiry: normalizeExpiry(String(item?.expiry || '')),
        category: CATEGORIES.includes(item?.category) ? item.category : 'other',
      }))
      .filter((item) => item.name);

    return res.status(200).json({ medicines });
  } catch (e) {
    return res.status(500).json({ error: 'Could not read the photos right now.' });
  }
};

function normalizeExpiry(value) {
  const text = (value || '').trim();
  let m = text.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) {
    const mm = Number(m[2]);
    if (mm >= 1 && mm <= 12) return `${m[1]}-${String(mm).padStart(2, '0')}`;
  }
  m = text.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const mm = Number(m[1]);
    if (mm >= 1 && mm <= 12) return `${m[2]}-${String(mm).padStart(2, '0')}`;
  }
  return '';
}
