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

type FridgeVisionItem = {
  name: string;
  quantity: string;
  category?: string;
  note?: string;
  status: 'full' | 'low' | 'out';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const gate = await rateGate(req, 'fridge-photo', 40, 3600);
    if (gate) return gate;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return json(
        { error: 'OPENAI_API_KEY is not configured for the edge function.' },
        500,
      );
    }

    const { imageBase64, mimeType } = await req.json();
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
                  'You analyze fridge photos and extract visible food products with high care. Look shelf by shelf and identify only items that are actually visible. Do not invent products. Merge duplicates of the same product if they clearly appear multiple times. Estimate quantity conservatively. Use statuses full, low, or out. Prefer generic grocery names like Milk, Eggs, Yogurt, Cheese, Butter, Juice, Tomatoes, Cucumbers. If the image is unclear, return fewer items rather than guessing.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'Analyze this fridge image and return a practical shopping-friendly inventory. Keep names short and generic. quantity should be a compact string like "1 bottle", "6 pcs", "1 pack", "2 jars". category and note are optional. Choose status rules carefully: full means enough stock, low means running low and likely needs buying soon, out means the product area is empty or there is effectively none left. Ignore non-food objects unless they are clearly grocery items or drinks.',
              },
              {
                type: 'input_image',
                image_url: imageDataUrl,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'fridge_inventory',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      name: { type: 'string' },
                      quantity: { type: 'string' },
                      category: { type: 'string' },
                      note: { type: 'string' },
                      status: {
                        type: 'string',
                        enum: ['full', 'low', 'out'],
                      },
                    },
                    required: ['name', 'quantity', 'status'],
                  },
                },
              },
              required: ['items'],
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
    const textOutput = payload?.output_text;
    if (!textOutput || typeof textOutput !== 'string') {
      return json({ error: 'OpenAI returned no structured output.' }, 500);
    }

    const parsed = JSON.parse(textOutput) as { items?: FridgeVisionItem[] };
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return json({
      items: items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        note: item.note,
        status: item.status,
      })),
    });
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
