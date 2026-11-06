import { createContext, useContext, type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { spokenWord, type Spoken } from "./life";
import type { CaptionWord } from "./types";

type Voice = { readonly words: readonly CaptionWord[]; readonly delayFrames: number };

const SpokenContext = createContext<Voice | null>(null);

// Gives a scene's text access to its voice clip, so on-screen words can react as they are said.
export const SpokenProvider = ({ voice, children }: { readonly voice: Voice | null; readonly children: ReactNode }) => (
  <SpokenContext.Provider value={voice}>{children}</SpokenContext.Provider>
);

// The word the voice is saying on this frame, or null between words and in scenes without a voice.
export const useSpoken = (): Spoken | null => {
  const voice = useContext(SpokenContext);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return voice ? spokenWord(voice.words, (frame - voice.delayFrames) / fps) : null;
};
