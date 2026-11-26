"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { keepListening } from "@/lib/speech";
import { Icon } from "./icons";

// The browser's speech recognition (Chrome on Android sends the audio to Google; Stride never stores it).
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
const noop = () => () => {};

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone blocked. Allow it for this site in your browser settings.",
  "service-not-allowed": "Microphone blocked. Allow it for this site in your browser settings.",
  "audio-capture": "No microphone found.",
  network: "Speech typing needs an internet connection.",
};

/**
 * Tap to speak, tap again to stop. Pauses don't stop it: phones end recognition at every pause, so it restarts
 * until you tap stop or stay silent for a while. Live words go to onInterim; each finished phrase goes to onFinal.
 * Hidden on browsers without speech recognition.
 */
export function VoiceButton({ onStart, onInterim, onFinal }: { onStart: () => void; onInterim: (text: string) => void; onFinal: (text: string) => void }) {
  const supported = useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const lang = useRef("en-NG");
  const stopped = useRef(true);
  const lastHeardAt = useRef(0);

  useEffect(
    () => () => {
      stopped.current = true;
      rec.current?.abort();
    },
    [],
  );
  if (!supported) return null;

  // Single-phrase sessions (continuous = false) behave the same on every browser; Android's continuous mode repeats words.
  function start(retry = false) {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    let lastError: string | null = null;
    r.lang = lang.current;
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let done = "";
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) done += result[0].transcript;
        else live += result[0].transcript;
      }
      if (done || live) lastHeardAt.current = Date.now();
      if (done) onFinal(done);
      else onInterim(live);
    };
    r.onerror = (e) => {
      // Fall back to general English once if Nigerian English isn't available on this device.
      if (e.error === "language-not-supported" && lang.current !== "en-US") {
        lang.current = "en-US";
        r.onend = () => start(true);
        return;
      }
      lastError = e.error;
      if (e.error !== "no-speech" && e.error !== "aborted") setError(ERRORS[e.error] ?? "Couldn't catch that. Try again.");
    };
    r.onend = () => {
      onInterim("");
      if (keepListening({ stopped: stopped.current, error: lastError, lastHeardAt: lastHeardAt.current, now: Date.now() })) {
        start(true);
        return;
      }
      stopped.current = true;
      setListening(false);
    };
    rec.current = r;
    if (!retry) {
      onStart();
      stopped.current = false;
      lastHeardAt.current = Date.now();
      setError(null);
    }
    setListening(true);
    try {
      r.start();
    } catch {
      // A phone can refuse an instant restart; finish the note instead of getting stuck "listening".
      stopped.current = true;
      setListening(false);
    }
  }

  function stop() {
    stopped.current = true;
    rec.current?.stop();
  }

  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        onClick={() => (listening ? stop() : start())}
        aria-pressed={listening}
        aria-label={listening ? "Stop listening" : "Speak instead of typing"}
        className={`press relative grid size-12 shrink-0 place-items-center rounded-full ${listening ? "bg-brand text-white" : "bg-track text-ink hover:bg-track-hover"}`}
      >
        {listening && <span className="listening-ring absolute inset-0 rounded-full border-4 border-brand" aria-hidden="true" />}
        <Icon name={listening ? "stop" : "mic"} className="size-6" />
      </button>
      <p className={`text-sm ${error ? "font-semibold text-risk" : "text-muted"}`} aria-live="polite">
        {error ?? (listening ? "Listening… say what you want to do" : "Tap to speak")}
      </p>
    </div>
  );
}
