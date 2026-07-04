// Home medicine cabinet helpers: categories, expiry parsing and status.
// Kept intentionally to an inventory (name + expiry + where/for whom) — no
// dosing advice, no medical records. See supabase/medicines.sql.
import type { MedicineCategory, MedicineItem } from '@/types/app';

export const MED_CATEGORIES: { key: MedicineCategory; label: string; emoji: string }[] = [
  { key: 'pain', label: 'Pain & fever', emoji: '🤕' },
  { key: 'cold', label: 'Cold & flu', emoji: '🤧' },
  { key: 'allergy', label: 'Allergy', emoji: '🌾' },
  { key: 'stomach', label: 'Stomach', emoji: '🩹' },
  { key: 'firstaid', label: 'First aid', emoji: '🩹' },
  { key: 'kids', label: 'Kids', emoji: '🧒' },
  { key: 'prescription', label: 'Prescription', emoji: '📋' },
  { key: 'other', label: 'Other', emoji: '💊' },
];

export function medCategoryMeta(category: MedicineCategory) {
  return MED_CATEGORIES.find((item) => item.key === category) || MED_CATEGORIES[MED_CATEGORIES.length - 1];
}

export type MedExpiryStatus = 'none' | 'ok' | 'soon' | 'expired';

// A medicine is "soon" to expire within this many days.
export const MED_SOON_DAYS = 60;

// Accept common written forms and normalize to 'YYYY-MM':
// "07/2026", "07.2026", "7/26", "2026-07", "2026/07". Returns '' if unusable.
export function normalizeExpiryInput(value: string): string {
  const text = (value || '').trim();
  if (!text) return '';
  let m: RegExpMatchArray | null;
  // YYYY-MM or YYYY/MM
  m = text.match(/^(\d{4})[-/.](\d{1,2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12) return `${year}-${String(month).padStart(2, '0')}`;
    return '';
  }
  // MM/YYYY or MM.YYYY or MM-YYYY
  m = text.match(/^(\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (month >= 1 && month <= 12) return `${year}-${String(month).padStart(2, '0')}`;
    return '';
  }
  // MM/YY
  m = text.match(/^(\d{1,2})[-/.](\d{2})$/);
  if (m) {
    const month = Number(m[1]);
    const year = 2000 + Number(m[2]);
    if (month >= 1 && month <= 12) return `${year}-${String(month).padStart(2, '0')}`;
    return '';
  }
  return '';
}

// End-of-month timestamp for a 'YYYY-MM' expiry (last day inclusive).
function expiryEndMs(expiry: string): number | null {
  const [y, m] = expiry.split('-').map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  // Date.UTC(y, m, 0) => last day of month `m` (m is 1-based here).
  return Date.UTC(y, m, 0, 23, 59, 59);
}

export function medExpiryStatus(expiry?: string, nowMs: number = Date.now()): MedExpiryStatus {
  if (!expiry) return 'none';
  const end = expiryEndMs(expiry);
  if (end == null) return 'none';
  if (nowMs > end) return 'expired';
  if (end - nowMs <= MED_SOON_DAYS * 24 * 60 * 60 * 1000) return 'soon';
  return 'ok';
}

export function formatExpiryLabel(expiry?: string): string {
  if (!expiry) return 'No date';
  const [y, m] = expiry.split('-');
  if (!y || !m) return 'No date';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const idx = Number(m) - 1;
  return `${months[idx] || m} ${y}`;
}

// Count of items that are expired or expiring soon — for the dashboard badge.
export function medsNeedAttentionCount(items: MedicineItem[], nowMs: number = Date.now()): number {
  return items.reduce((sum, item) => {
    const status = medExpiryStatus(item.expiry, nowMs);
    return status === 'expired' || status === 'soon' ? sum + 1 : sum;
  }, 0);
}

export function medsExpiredCount(items: MedicineItem[], nowMs: number = Date.now()): number {
  return items.reduce((sum, item) => (medExpiryStatus(item.expiry, nowMs) === 'expired' ? sum + 1 : sum), 0);
}
