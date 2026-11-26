import { describe, expect, it } from "vitest";
import { appendSpeech, keepListening, SILENCE_LIMIT_MS, tidyTranscript } from "./speech";

describe("tidyTranscript", () => {
  it("drops filler words and capitalises the start", () => {
    expect(tidyTranscript("um I need to uh submit my assignment by friday")).toBe("I need to submit my assignment by friday");
    expect(tidyTranscript("hmm, okay so read every day")).toBe("Okay so read every day");
    expect(tidyTranscript("erm  ehm   learn SQL")).toBe("Learn SQL");
  });

  it("keeps real words that merely look like fillers", () => {
    expect(tidyTranscript("I like to read every day")).toBe("I like to read every day");
    expect(tidyTranscript("summer umbrella")).toBe("Summer umbrella");
  });

  it("tidies spacing and stray commas", () => {
    expect(tidyTranscript("  read ,  every   day ")).toBe("Read, every day");
    expect(tidyTranscript("")).toBe("");
  });
});

describe("appendSpeech", () => {
  it("adds speech after what's already typed, with one space", () => {
    expect(appendSpeech("Read 10 pages", "every morning")).toBe("Read 10 pages every morning");
    expect(appendSpeech("Read 10 pages ", " every morning")).toBe("Read 10 pages every morning");
    expect(appendSpeech("", "every morning")).toBe("every morning");
    expect(appendSpeech("Read", "")).toBe("Read");
  });
});

describe("keepListening", () => {
  const now = 1_000_000;

  it("keeps a voice note going through a pause (phones end recognition at every pause)", () => {
    expect(keepListening({ stopped: false, error: null, lastHeardAt: now - 2_000, now })).toBe(true);
    expect(keepListening({ stopped: false, error: "no-speech", lastHeardAt: now - 8_000, now })).toBe(true);
  });

  it("stops when you tap stop", () => {
    expect(keepListening({ stopped: true, error: null, lastHeardAt: now, now })).toBe(false);
  });

  it("stops on errors that won't fix themselves", () => {
    for (const error of ["not-allowed", "service-not-allowed", "audio-capture", "network", "aborted"]) {
      expect(keepListening({ stopped: false, error, lastHeardAt: now, now })).toBe(false);
    }
  });

  it("stops by itself after a long silence", () => {
    expect(keepListening({ stopped: false, error: "no-speech", lastHeardAt: now - SILENCE_LIMIT_MS, now })).toBe(false);
  });
});

describe("tidyTranscript mid-sentence", () => {
  it("leaves the first letter alone when a phrase continues a sentence", () => {
    expect(tidyTranscript("um by friday", false)).toBe("by friday");
    expect(tidyTranscript("by friday", true)).toBe("By friday");
  });
});
