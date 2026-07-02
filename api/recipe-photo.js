// Vercel serverless function: generate a unified-style AI food photo for a
// user-created recipe via OpenAI gpt-image-1. The API key stays server-side
// (OPENAI_API_KEY in Vercel env) and is never shipped to the browser.
//
// The same bright/clean style string as scripts/generateAiPhotos.ts so
// user recipes match the look of the built-in ones.

const STYLE =
  'professional food photography, bright soft natural daylight, clean light neutral background, ' +
  'minimal prop styling, fresh and appetizing, sharp focus, high detail, 45 degree angle, ' +
  'no text, no watermark, no people, no hands';

module.exports = async function handler(req, res) {
  // Allow the localhost preview (:8090) to call the deployed function too.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY is not configured on the server.' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const title = String(body.title || '').slice(0, 120).trim();
    const description = String(body.description || '').slice(0, 220).trim();
    const mealType = String(body.mealType || '').slice(0, 40).trim().replace(/_/g, ' ');
    if (!title) return res.status(400).json({ error: 'A recipe title is required.' });

    // Describe the FINISHED, plated dish. We deliberately avoid passing cooking
    // steps as context — they describe batter/prep and make the model draw raw
    // mixtures instead of the ready-to-eat dish.
    const context = mealType ? ` (a ${mealType} dish)` : '';
    const detail = description ? ` ${description}.` : '';
    const prompt =
      `A finished, plated, ready-to-eat serving of ${title}${context}, as it looks when cooked and served.${detail} ` +
      `Show the completed cooked dish plated on a plate or in a bowl — not raw batter, not a mixing bowl, not uncooked ingredients. ` +
      STYLE;

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1536x1024', quality: 'medium', n: 1 }),
    });
    const data = await r.json();
    if (!r.ok) {
      const message = (data && data.error && data.error.message) || 'Image generation failed.';
      return res.status(r.status).json({ error: message });
    }
    const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) return res.status(502).json({ error: 'No image was returned.' });
    return res.status(200).json({ image: `data:image/png;base64,${b64}` });
  } catch (e) {
    return res.status(500).json({ error: 'Could not generate the photo right now.' });
  }
};
