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
    // A child adding words. Cap generously but guard runaway cost (each call is batched).
    const gate = await rateGate(req, 'enrich-words', 40, 3600);
    if (gate) return gate;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return json({ error: 'OPENAI_API_KEY is not configured for the edge function.' }, 500);
    }

    const body = await req.json();
    const rawInputs: unknown = body?.inputs;
    const learn = typeof body?.learn === 'string' && body.learn.trim() ? body.learn.trim() : 'es';
    const native = typeof body?.native === 'string' && body.native.trim() ? body.native.trim() : 'ru';
    const inputs = Array.isArray(rawInputs)
      ? rawInputs.filter((w) => typeof w === 'string' && w.trim()).map((w) => (w as string).trim()).slice(0, 40)
      : [];
    if (inputs.length === 0) {
      return json({ error: 'inputs (a non-empty array of words) is required.' }, 400);
    }

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
                  `You help a child learn vocabulary. The languages are given as ISO 639-1 codes: the language being LEARNED is "${learn}" and the child's NATIVE language is "${native}". ` +
                  `For each user-provided word — which may be written in EITHER the learned language OR the native language — detect which language it is and produce a normalized card:\n` +
                  `- "input": echo the original word exactly as given.\n` +
                  `- "term": the word in the LEARNED language (${learn}). If the input was already in ${learn}, keep it (fix obvious casing/spelling); if it was in ${native}, translate it to ${learn}.\n` +
                  `- "translation": the word's meaning in the NATIVE language (${native}).\n` +
                  `- "example": ONE short, natural example sentence USING the term, written in the LEARNED language (${learn}), suitable for a child.\n` +
                  `- "distractors": exactly 3 plausible-but-WRONG options in the NATIVE language (${native}) — same part of speech and rough theme as the translation, never synonyms of it, all different. These are wrong answers for a multiple-choice quiz.\n` +
                  `Keep words in their base/dictionary form. Return every input word in the same order.`,
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `Make cards for these words:\n${inputs.map((w, i) => `${i + 1}. ${w}`).join('\n')}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'word_cards',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                words: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      input: { type: 'string' },
                      term: { type: 'string' },
                      translation: { type: 'string' },
                      example: { type: 'string' },
                      distractors: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['input', 'term', 'translation', 'example', 'distractors'],
                  },
                },
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
    // The raw /v1/responses HTTP body has no top-level output_text (that's an SDK
    // convenience) — the JSON string lives in output[].content[] where type is
    // 'output_text'. Fall back through both shapes.
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
      ? parsed.words.map((w: Record<string, unknown>) => ({
          input: String(w.input ?? ''),
          term: String(w.term ?? ''),
          translation: String(w.translation ?? ''),
          example: String(w.example ?? ''),
          distractors: Array.isArray(w.distractors) ? w.distractors.map((d) => String(d)).slice(0, 3) : [],
        }))
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
