// Where things go in your week. Pure functions: no database, no AI, so they are easy to test and work with the laptop off.
import { addDays, localParts, toMinutes, zoned } from "./time";

export type Block = { start: string; end: string };
/** Free time per weekday: "0" = Sunday … "6" = Saturday, local "HH:MM" times. */
export type FreeBlocks = Record<string, Block[]>;
export type Slot = { start: Date; end: Date };

const weekday: Block[] = [{ start: "18:00", end: "22:00" }];
const weekend: Block[] = [
  { start: "10:00", end: "13:00" },
  { start: "16:00", end: "20:00" },
];
export const DEFAULT_FREE_BLOCKS: FreeBlocks = { "0": weekend, "1": weekday, "2": weekday, "3": weekday, "4": weekday, "5": weekday, "6": weekend };

const MIN = 60_000;

/** Removes the busy times from a slot, returning what's left. */
function subtract(slot: Slot, busy: Slot[]): Slot[] {
  let pieces = [slot];
  for (const b of busy) {
    pieces = pieces.flatMap((p) => {
      if (b.end <= p.start || b.start >= p.end) return [p];
      const left = b.start > p.start ? [{ start: p.start, end: b.start }] : [];
      const right = b.end < p.end ? [{ start: b.end, end: p.end }] : [];
      return [...left, ...right];
    });
  }
  return pieces;
}

/** Your free time between two instants, minus anything already scheduled, earliest first. */
export function freeSlots(blocks: FreeBlocks, tz: string, from: Date, to: Date, busy: Slot[]): Slot[] {
  const slots: Slot[] = [];
  const last = localParts(to, tz).date;
  for (let date = localParts(from, tz).date; date <= last; date = addDays(date, 1)) {
    const day = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const b of blocks[String(day)] ?? []) {
      const start = new Date(Math.max(zoned(date, toMinutes(b.start), tz).getTime(), from.getTime()));
      const end = new Date(Math.min(zoned(date, toMinutes(b.end), tz).getTime(), to.getTime()));
      if (end > start) slots.push(...subtract({ start, end }, busy));
    }
  }
  return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface Placed {
  step: number;
  title: string;
  starts_at: Date;
  minutes: number;
}

/**
 * Puts a task's steps, in order, into the earliest free time before the deadline. It first tries to leave the last 20%
 * of the time before the deadline free as a buffer; steps that don't fit that way may use the buffer. Steps that still
 * don't fit are returned in `unplaced` (the task is then "at risk").
 */
export function placeSteps(
  steps: { title: string; minutes: number }[],
  slots: Slot[],
  deadline: Date,
  now: Date,
): { placed: Placed[]; unplaced: number[] } {
  const free = slots.map((s) => ({ start: new Date(s.start), end: new Date(Math.min(s.end.getTime(), deadline.getTime())) }));
  const bufferStart = new Date(now.getTime() + 0.8 * Math.max(0, deadline.getTime() - now.getTime()));
  const placed: Placed[] = [];
  const unplaced: number[] = [];
  let after = now;
  let useBuffer = false;

  const fit = (minutes: number, limit: Date): Date | null => {
    for (const slot of free) {
      const start = slot.start > after ? slot.start : after;
      const end = new Date(start.getTime() + minutes * MIN);
      if (end <= slot.end && end <= limit) {
        slot.start = end;
        return start;
      }
    }
    return null;
  };

  steps.forEach((s, step) => {
    let start = useBuffer ? null : fit(s.minutes, bufferStart);
    if (!start) {
      useBuffer = true;
      start = fit(s.minutes, deadline);
    }
    if (!start) return unplaced.push(step);
    placed.push({ step, title: s.title, starts_at: start, minutes: s.minutes });
    after = new Date(start.getTime() + s.minutes * MIN);
  });
  return { placed, unplaced };
}

/**
 * One start per day for a habit: the preferred time if nothing else is scheduled then, otherwise the nearest free time
 * that day, otherwise the preferred time anyway (habits like waking up don't need a free block).
 */
export function placeDaily(days: string[], minutes: number, tz: string, blocks: FreeBlocks, preferred: number, busy: Slot[]): Date[] {
  return days.map((day) => {
    const want = zoned(day, preferred, tz);
    const wantEnd = new Date(want.getTime() + minutes * MIN);
    if (!busy.some((b) => b.start < wantEnd && b.end > want)) return want;
    let best: Date | null = null;
    for (const slot of freeSlots(blocks, tz, zoned(day, 0, tz), zoned(addDays(day, 1), 0, tz), busy)) {
      if (slot.end.getTime() - slot.start.getTime() < minutes * MIN) continue;
      const latest = slot.end.getTime() - minutes * MIN;
      const t = new Date(Math.min(Math.max(want.getTime(), slot.start.getTime()), latest));
      if (!best || Math.abs(t.getTime() - want.getTime()) < Math.abs(best.getTime() - want.getTime())) best = t;
    }
    return best ?? want;
  });
}

// Every other day first (Mon, Wed, Fri, Sun), then the days in between, so sessions get spread out.
const SPREAD = [0, 2, 4, 6, 1, 3, 5];

/** Study sessions for one week (weekStart = Monday's date), each on a different day where possible, earliest free time. */
export function placeWeekly(
  weekStart: string,
  sessions: number,
  minutes: number,
  tz: string,
  blocks: FreeBlocks,
  busy: Slot[],
  notBefore?: Date,
): Date[] {
  const taken = [...busy];
  const starts: Date[] = [];
  for (const offset of SPREAD) {
    if (starts.length >= sessions) break;
    const day = addDays(weekStart, offset);
    const dayStart = zoned(day, 0, tz);
    const from = notBefore && notBefore > dayStart ? notBefore : dayStart;
    const slot = freeSlots(blocks, tz, from, zoned(addDays(day, 1), 0, tz), taken).find(
      (s) => s.end.getTime() - s.start.getTime() >= minutes * MIN,
    );
    if (!slot) continue;
    starts.push(slot.start);
    taken.push({ start: slot.start, end: new Date(slot.start.getTime() + minutes * MIN) });
  }
  return starts.sort((a, b) => a.getTime() - b.getTime());
}
