// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Require an authenticated caller and cap per-user calls so nobody can run up OpenAI cost.
async function rateGate(req: Request, bucket: string, limit: number, windowSeconds: number) {
  const url = Deno.env.get('SUPABASE_URL');
  const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !svc) return null;
  const userClient = createClient(url, anon || svc, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
  });
  const { data: u } = await userClient.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return json({ error: 'Not authenticated.' }, 401);
  const admin = createClient(url, svc);
  const { data: allowed } = await admin.rpc('bump_rate_limit', {
    p_user: uid,
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (allowed === false) return json({ error: 'Too many requests — please try again shortly.' }, 429);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const gate = await rateGate(req, 'scan-words', 30, 3600);
    if (gate) return gate;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return json({ error: 'OPENAI_API_KEY is not configured for the edge function.' }, 500);
    }

    const body = await req.json();
    const imageBase64 = body?.imageBase64;
    const mimeType = body?.mimeType;
    const learn = typeof body?.learn === 'string' && body.learn.trim() ? body.learn.trim() : 'es';
    const native = typeof body?.native === 'string' && body.native.trim() ? body.native.trim() : 'ru';
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return json({ error: 'imageBase64 is required.' }, 400);
    }

    const imageDataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text:
                  `You read a photo of a child's language-study notebook or a written vocabulary list (handwritten or printed). ` +
                  `The child is learning "${learn}" and their native language is "${native}". ` +
                  `Extract the vocabulary words the child is studying, one entry per word.\n` +
                  `RULES:\n` +
                  `- When a line pairs a word with its translation (e.g. "alto = tall", "casa - house", "alto/bajo = tall/short"), extract ONLY the word(s) in the language being LEARNED (${learn}) — do NOT also add the ${native} translation side.\n` +
                  `- Split slash- or comma-separated groups into separate words (e.g. "alto/bajo" → "alto", "bajo").\n` +
                  `- Return each word in its base/dictionary form. Preserve accents/diacritics (á, é, í, ó, ú, ñ, ü).\n` +
                  `- IGNORE page headers, grammar labels/titles, dates, page numbers, exercise numbers, doodles, and full sentences.\n` +
                  `- Include each distinct word only once. Return an empty list if you see no vocabulary words.`,
              },
            ],
          },
          {
            role: 'user',
            content: [
              { type: 'input_text', text: 'Extract the vocabulary words from this notebook photo as a clean list.' },
              { type: 'input_image', image_url: imageDataUrl },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'scanned_words',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                words: { type: 'array', items: { type: 'string' } },
              },
              required: ['words'],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return json({ error: `OpenAI request failed: ${errorText}` }, 500);
    }

    const payload = await response.json();
    // Raw /v1/responses has no top-level output_text — pull it from output[].content[].
    const textOutput =
      (typeof payload?.output_text === 'string' && payload.output_text) ||
      (Array.isArray(payload?.output)
        ? payload.output
            .flatMap((o: Record<string, unknown>) => (Array.isArray(o?.content) ? o.content : []))
            .find((c: Record<string, unknown>) => c?.type === 'output_text' && typeof c?.text === 'string')?.text
        : undefined);
    if (!textOutput || typeof textOutput !== 'string') {
      return json({ error: 'OpenAI returned no structured output.' }, 500);
    }

    const parsed = JSON.parse(textOutput);
    const words = Array.isArray(parsed?.words)
      ? parsed.words.map((w: unknown) => String(w).trim()).filter(Boolean).slice(0, 60)
      : [];
    return json({ words });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
