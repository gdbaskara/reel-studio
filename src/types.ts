import type { LookId } from "./looks/types";

export type Drawing = "arrow" | "circle" | "zigzag" | "check" | "star";

export type Palette = {
  readonly paper: string;
  readonly ink: string;
  readonly accent: string;
  readonly highlight: string;
  readonly onAccent: string;
};

// center: the original stacked layout. left: badge, title and note aligned left.
// big-number: a large step number leads, with the title under it.
export type StepLayout = "center" | "left" | "big-number";
// label: the small line becomes a coloured tag above the big line.
export type TitleLayout = "center" | "left" | "label";
// card: both lines sit on an accent-coloured card.
export type OutroLayout = "center" | "left" | "card";

export type Step = {
  readonly title: string;
  readonly note: string;
  readonly drawing: Drawing;
  // Absent means center.
  readonly layout?: StepLayout;
};

// One reel = one voiceover script (voiceover/<id>.txt) + this visual spec.
export type ReelSpec = {
  readonly id: string;
  // Absent on reels made before looks existed; they use Notebook.
  readonly look?: LookId;
  // Absent uses the look's own transition.
  readonly transition?: "fade" | "slide" | "wipe" | "iris";
  readonly palette: Palette;
  readonly title: { readonly lead: string; readonly main: string; readonly layout?: TitleLayout };
  readonly steps: readonly Step[];
  readonly outro: { readonly main: string; readonly sub: string; readonly layout?: OutroLayout };
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

// A handle and/or logo shown in a top corner of every scene. logo is an image URL.
export type BrandMark = {
  readonly handle: string;
  readonly position: "top-left" | "top-center" | "top-right";
  readonly logo?: string;
};

export type ReelProps = {
  readonly spec: ReelSpec;
  readonly voice: Voiceover;
  readonly captions?: boolean;
  readonly music?: Music;
  // The thin bar along the bottom edge that shows how far the reel has played.
  readonly progressBar?: boolean;
  readonly brand?: BrandMark;
};
