import { Chore, ChoreRecurrence } from '@/types/app';

// "Done for the current period" derives from the last done/verified date + recurrence,
// so a daily chore resets each day and a weekly one each ISO week.

export function choreTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function choreWeekKey(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / 86400000 / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

export function choreInCurrentPeriod(dateStr: string | undefined, recurrence: ChoreRecurrence) {
  if (!dateStr) return false;
  if (recurrence === 'once') return true;
  if (recurrence === 'weekly') return choreWeekKey(dateStr) === choreWeekKey(choreTodayKey());
  return dateStr === choreTodayKey();
}

export function choreStatus(chore: Chore): 'todo' | 'done' | 'verified' {
  if (choreInCurrentPeriod(chore.lastVerifiedDate, chore.recurrence)) return 'verified';
  if (choreInCurrentPeriod(chore.lastDoneDate, chore.recurrence)) return 'done';
  return 'todo';
}
