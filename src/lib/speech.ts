// Voice notes: tidying what the phone's speech recognition heard, Wispr Flow style.

// Hesitation sounds only, matched as whole words ("um", "uhh", "erm", "ehm", "hmm"), never real words like "like" or "umbrella".
const FILLERS = /\b(?:u+m+|u+h+|e+r+m+|e+h+m+|h+m+)\b,?/gi;

/** Drops filler sounds and fixes spacing around commas; capitalises the start unless the phrase continues a sentence. */
export function tidyTranscript(text: string, startsSentence = true): string {
  const clean = text
    .replace(FILLERS, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/^[\s,]+/, "")
    .trim();
  return startsSentence ? clean.charAt(0).toUpperCase() + clean.slice(1) : clean;
}

/** Adds spoken words after whatever is already in the box, with exactly one space between. */
export function appendSpeech(base: string, spoken: string): string {
  const said = spoken.trim();
  if (!said) return base;
  const before = base.trimEnd();
  return before ? `${before} ${said}` : said;
}

/** How long a voice note keeps listening with nothing said before it stops by itself. */
export const SILENCE_LIMIT_MS = 15_000;

// A blocked or missing microphone, no internet, or our own abort: restarting won't help.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture", "network", "aborted"]);

/**
 * Phones end speech recognition at every pause, so a voice note restarts it until you tap stop,
 * a real error happens, or nothing has been said for SILENCE_LIMIT_MS.
 */
export function keepListening(s: { stopped: boolean; error: string | null; lastHeardAt: number; now: number }): boolean {
  if (s.stopped) return false;
  if (s.error && FATAL_ERRORS.has(s.error)) return false;
  return s.now - s.lastHeardAt < SILENCE_LIMIT_MS;
}
