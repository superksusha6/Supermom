import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// One enriched vocabulary card produced by the enrich-words edge function.
export type EnrichedWord = {
  input: string;         // the original word the child typed
  term: string;          // normalized to the language being learned
  translation: string;   // meaning in the child's native language
  example: string;       // example sentence in the learned language
  distractors: string[]; // 3 wrong multiple-choice options (native language)
};

type EnrichWordsResponse = { words: EnrichedWord[] };

// Send raw words (in either language of the pair) to the AI, which detects the
// language and returns a full card: term (learned lang), translation (native),
// example sentence, and 3 quiz distractors. Batched — pass several at once.
export async function enrichWords(inputs: string[], learn: string, native: string): Promise<EnrichedWord[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const cleaned = inputs.map((w) => w.trim()).filter(Boolean);
  if (cleaned.length === 0) return [];

  const { data, error } = await supabase.functions.invoke<EnrichWordsResponse>('enrich-words', {
    body: { inputs: cleaned, learn, native },
  });

  if (error) {
    throw new Error(error.message || 'Could not translate your words.');
  }
  return Array.isArray(data?.words) ? data!.words : [];
}
