// How habits adapt to what you actually do. Pure functions.

export type DayStatus = "done" | "skipped" | "missed" | "planned";

/** The weekly check: 6–7 of 7 days → offer a level up; 4–5 → stay; 3 or fewer → one level down, with a reason. */
export function weeklyLevel(level: number, doneLast7: number, maxLevel: number): { level: number; offerUp: boolean; note: string | null } {
  if (doneLast7 >= 6) return { level, offerUp: level < maxLevel, note: null };
  if (doneLast7 >= 4) return { level, offerUp: false, note: null };
  if (level === 0) return { level, offerUp: false, note: `${doneLast7} of 7 days last week. Staying at the easiest level until it sticks.` };
  return { level: level - 1, offerUp: false, note: `Moved down a level after ${doneLast7} of 7 days. Easier to keep going.` };
}

/** Days in a row with the habit done, ending today (or yesterday, if today isn't done yet). Skipped days don't break it. */
export function streak(days: { date: string; status: DayStatus }[], today: string): number {
  const byDate = new Map<string, DayStatus>();
  for (const d of days) if (byDate.get(d.date) !== "done") byDate.set(d.date, d.status);
  let count = 0;
  const cursor = new Date(`${today}T12:00:00Z`);
  for (let first = true; ; first = false) {
    const status = byDate.get(cursor.toISOString().slice(0, 10));
    if (status === "done") count++;
    else if (status === "skipped" || (first && status !== "missed")) {
      // a rest day, or today not done yet: keep looking back
    } else break;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

/** How many of the most recent sessions (newest first) were missed in a row. */
export function missedInARow(statuses: string[]): number {
  const firstOther = statuses.findIndex((s) => s !== "missed");
  return firstOther === -1 ? statuses.length : firstOther;
}

/**
 * After 14 check-ins, a habit's reminder moves to the median time you actually did it, within the habit's window,
 * rounded to 5 minutes.
 */
export function adaptTime(doneMinutes: number[], window: { start: number; end: number }, current: number): number {
  if (doneMinutes.length < 14) return current;
  const sorted = [...doneMinutes].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  const median = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
  const clamped = Math.min(Math.max(median, window.start), window.end);
  return Math.round(clamped / 5) * 5;
}
