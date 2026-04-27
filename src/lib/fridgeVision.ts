import { FridgeItem } from '@/types/app';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type AnalyzeFridgePhotoPayload = {
  imageBase64: string;
  mimeType?: string;
};

type AnalyzeFridgePhotoResponse = {
  items: Array<Omit<FridgeItem, 'id'>>;
};

export async function analyzeFridgePhoto(payload: AnalyzeFridgePhotoPayload): Promise<Array<Omit<FridgeItem, 'id'>>> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<AnalyzeFridgePhotoResponse>('analyze-fridge-photo', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Vision request failed.');
  }

  return Array.isArray(data?.items) ? data.items : [];
}
