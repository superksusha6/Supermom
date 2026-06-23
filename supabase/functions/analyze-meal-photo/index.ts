// @ts-nocheck

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return json({ error: 'OPENAI_API_KEY is not configured for the edge function.' }, 500);
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
                  'You analyze meal photos for a nutrition tracker. Estimate conservatively and never pretend to know the exact recipe or exact weight. Return one practical meal label, an estimated portion weight in grams, calories per 100 g, protein per 100 g, fat per 100 g, carbs per 100 g, a confidence level, a short note, and a short list of detected foods. If the image is unclear, keep confidence low and make the estimate broad but realistic.',
              },
            ],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text:
                  'Estimate this meal for food logging. Use short meal names like "Chicken salad", "Pasta with sauce", "Rice bowl", "Yogurt with berries". If multiple foods are visible, combine them into one practical meal entry. Return nutrition normalized to 100 g plus estimated portion grams so the app can recalculate the final portion. Be careful with oils, sauces, cheese, rice, pasta, desserts, and fried foods because they affect calories strongly.',
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
            name: 'meal_photo_estimate',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                estimate: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    mealName: { type: 'string' },
                    estimatedAmountGrams: { type: 'number' },
                    caloriesPer100g: { type: 'number' },
                    proteinPer100g: { type: 'number' },
                    fatPer100g: { type: 'number' },
                    carbsPer100g: { type: 'number' },
                    confidence: {
                      type: 'string',
                      enum: ['low', 'medium', 'high'],
                    },
                    note: { type: 'string' },
                    detectedFoods: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: [
                    'mealName',
                    'estimatedAmountGrams',
                    'caloriesPer100g',
                    'proteinPer100g',
                    'fatPer100g',
                    'carbsPer100g',
                    'confidence',
                    'note',
                    'detectedFoods',
                  ],
                },
              },
              required: ['estimate'],
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

    const parsed = JSON.parse(textOutput);
    return json({
      estimate: parsed?.estimate
        ? {
            mealName: parsed.estimate.mealName,
            estimatedAmountGrams: Math.max(1, Math.round(Number(parsed.estimate.estimatedAmountGrams) || 0)),
            caloriesPer100g: Math.max(0, Math.round((Number(parsed.estimate.caloriesPer100g) || 0) * 10) / 10),
            proteinPer100g: Math.max(0, Math.round((Number(parsed.estimate.proteinPer100g) || 0) * 10) / 10),
            fatPer100g: Math.max(0, Math.round((Number(parsed.estimate.fatPer100g) || 0) * 10) / 10),
            carbsPer100g: Math.max(0, Math.round((Number(parsed.estimate.carbsPer100g) || 0) * 10) / 10),
            confidence: parsed.estimate.confidence,
            note: parsed.estimate.note,
            detectedFoods: Array.isArray(parsed.estimate.detectedFoods) ? parsed.estimate.detectedFoods : [],
          }
        : null,
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
