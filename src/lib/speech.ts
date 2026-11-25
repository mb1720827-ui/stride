// Voice notes: tidying what the phone's speech recognition heard, Wispr Flow style.

// Hesitation sounds only, matched as whole words ("um", "uhh", "erm", "ehm", "hmm"), never real words like "like" or "umbrella".
const FILLERS = /\b(?:u+m+|u+h+|e+r+m+|e+h+m+|h+m+)\b,?/gi;

/** Drops filler sounds, fixes spacing around commas and capitalises the start. */
export function tidyTranscript(text: string): string {
  const clean = text
    .replace(FILLERS, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/^[\s,]+/, "")
    .trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** Adds spoken words after whatever is already in the box, with exactly one space between. */
export function appendSpeech(base: string, spoken: string): string {
  const said = spoken.trim();
  if (!said) return base;
  const before = base.trimEnd();
  return before ? `${before} ${said}` : said;
}
