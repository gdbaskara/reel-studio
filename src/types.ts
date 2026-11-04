import type { LookId } from "./looks/types";

export type Drawing = "arrow" | "circle" | "zigzag" | "check" | "star";

export type Palette = {
  readonly paper: string;
  readonly ink: string;
  readonly accent: string;
  readonly highlight: string;
  readonly onAccent: string;
};

export type Step = {
  readonly title: string;
  readonly note: string;
  readonly drawing: Drawing;
};

// One reel = one voiceover script (voiceover/<id>.txt) + this visual spec.
export type ReelSpec = {
  readonly id: string;
  // Absent on reels made before looks existed; they use Notebook.
  readonly look?: LookId;
  readonly palette: Palette;
  readonly title: { readonly lead: string; readonly main: string };
  readonly steps: readonly Step[];
  readonly outro: { readonly main: string; readonly sub: string };
};

export type CaptionWord = { readonly text: string; readonly start: number; readonly end: number };

export type VoiceClip = {
  readonly duration: number;
  readonly text: string;
  readonly words: readonly CaptionWord[];
  // Audio URL. When absent, the clip is read from public/vo/<reel>/<sceneId>.wav.
  readonly src?: string;
};

export type Voiceover = Readonly<Partial<Record<string, VoiceClip>>>;

// Background music under the whole reel. volume is its level away from the voice (0..1);
// duck lowers it while a voice clip plays.
export type Music = {
  readonly src: string;
  readonly duration: number;
  readonly volume: number;
  readonly duck: boolean;
};

export type ReelProps = {
  readonly spec: ReelSpec;
  readonly voice: Voiceover;
  readonly captions?: boolean;
  readonly music?: Music;
  // The thin bar along the bottom edge that shows how far the reel has played.
  readonly progressBar?: boolean;
};
