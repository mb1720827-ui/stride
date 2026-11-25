import { describe, expect, it } from "vitest";
import { appendSpeech, tidyTranscript } from "./speech";

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
