// Local wall-clock time in the user's time zone <-> UTC instants. Only Intl, so it runs the same on the server,
// in the browser and in the laptop worker.

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(tz, f);
  }
  return f;
}

function parts(at: Date, tz: string) {
  const p = Object.fromEntries(formatter(tz).formatToParts(at).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, weekday: p.weekday };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "18:30" -> 1110 */
export const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** 1110 -> "18:30" */
export const fromMinutes = (minutes: number): string => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** The local date, minutes after local midnight and weekday (0 = Sunday) of an instant. */
export function localParts(at: Date, tz: string): { date: string; minutes: number; weekday: number } {
  const p = parts(at, tz);
  return { date: `${p.y}-${pad(p.m)}-${pad(p.d)}`, minutes: p.h * 60 + p.min, weekday: new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() };
}

/** Minutes the zone is ahead of UTC at this instant. */
function offsetMinutes(at: Date, tz: string): number {
  const p = parts(at, tz);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - at.getTime()) / 60_000);
}

/** The UTC instant of a local wall time (date "YYYY-MM-DD", minutes after midnight) in a time zone. */
export function zoned(date: string, minutes: number, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const first = new Date(guess - offsetMinutes(new Date(guess), tz) * 60_000);
  // The offset at the real instant can differ from the guess's on a daylight-saving change day.
  return new Date(guess - offsetMinutes(first, tz) * 60_000);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Tue 18:00" */
export function formatLocal(at: Date, tz: string): string {
  const p = parts(at, tz);
  return `${p.weekday} ${pad(p.h)}:${pad(p.min)}`;
}

/** "18:00" */
export const timeLocal = (at: Date, tz: string): string => fromMinutes(localParts(at, tz).minutes);
