import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AnalyzeMealPhotoPayload = {
  imageBase64: string;
  mimeType?: string;
};

export type MealPhotoEstimate = {
  mealName: string;
  estimatedAmountGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  confidence?: 'low' | 'medium' | 'high';
  note?: string;
  detectedFoods?: string[];
};

type AnalyzeMealPhotoResponse = {
  estimate: MealPhotoEstimate | null;
};

export async function analyzeMealPhoto(payload: AnalyzeMealPhotoPayload): Promise<MealPhotoEstimate | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke<AnalyzeMealPhotoResponse>('analyze-meal-photo', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || 'Meal vision request failed.');
  }

  return data?.estimate || null;
}
