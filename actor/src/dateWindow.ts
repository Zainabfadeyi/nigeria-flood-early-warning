/** Whole days between today (UTC) and an ISO date string. Negative means in the past. */
export function daysFromToday(dateIso: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(`${dateIso}T00:00:00Z`);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isWithinHorizon(dateIso: string, days: number): boolean {
  const offset = daysFromToday(dateIso);
  return offset >= 0 && offset < days;
}
