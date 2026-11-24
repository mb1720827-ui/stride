// Small pure helpers for the laptop worker (worker/worker.ts).
import { addDays, localParts } from "./time";

type Linked = { url: string };

/**
 * Keeps only resources whose link actually loads (checked by our own code, not the AI's word), once each, in order.
 * Only http(s) links are ever fetched.
 */
export async function checkLinks<T extends Linked>(resources: T[], fetcher: (url: string) => Promise<{ ok: boolean }>): Promise<T[]> {
  const seen = new Set<string>();
  const kept: T[] = [];
  for (const r of resources) {
    if (seen.has(r.url) || !/^https?:\/\//i.test(r.url)) continue;
    seen.add(r.url);
    try {
      if ((await fetcher(r.url)).ok) kept.push(r);
    } catch {
      // unreachable or too slow: leave it out
    }
  }
  return kept;
}

/** Monday of the local week containing `now`, as YYYY-MM-DD. */
export function weekStartOf(now: Date, tz: string): string {
  const { date, weekday } = localParts(now, tz);
  return addDays(date, -((weekday + 6) % 7));
}

/** The weekly review is written on Sunday from 18:00 local time. */
export function reviewDue(now: Date, tz: string): boolean {
  const { weekday, minutes } = localParts(now, tz);
  return weekday === 0 && minutes >= 18 * 60;
}
