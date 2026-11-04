import type { Palette } from "../types";
import type { FontKey } from "./fonts";

// Ids of every look, in the order the editor shows them. The first one is the default.
export const LOOK_IDS = ["notebook", "bold-pop", "minimal", "neon", "koran", "pastel"] as const;
export type LookId = (typeof LOOK_IDS)[number];

export type Spring = { readonly damping: number; readonly stiffness?: number; readonly mass?: number };

export type FontChoice = { readonly key: FontKey; readonly weight: number };

// How text and shapes move. Delays are in frames from the start of a scene.
export type Motion = {
  readonly word: Spring;
  readonly stagger: number;
  // Words rise this many px and grow from this scale as they appear.
  readonly rise: number;
  readonly scaleFrom: number;
  readonly badge: Spring;
  readonly badgeSpin: number;
  readonly note: Spring;
  readonly noteFrom: "right" | "bottom" | "fade";
  readonly noteTilt: number;
  // Hand-drawn jitter of headlines; 0 turns it off.
  readonly wobble: number;
  // Frames each scene fades out over at its end; the outro may linger longer.
  readonly fadeOut: number;
  readonly outroFadeOut: number;
  readonly delays: {
    readonly titleLead: number;
    readonly titleMain: number;
    readonly titleMark: number;
    readonly stepTitle: number;
    readonly stepNote: number;
    readonly stepDoodle: number;
    readonly outroMain: number;
    readonly outroMark: number;
    readonly outroSub: number;
  };
};

// Font sizes in px on the 1080x1920 canvas.
export type TypeScale = {
  readonly titleLead: number;
  readonly titleMain: number;
  readonly stepTitle: number;
  readonly note: number;
  readonly outroMain: number;
  readonly outroSub: number;
  readonly badge: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly uppercase: boolean;
};

export type BackgroundKind = "flat" | "dots" | "grid" | "lines" | "gradient" | "grain";
// scribble: hand-drawn marker strokes. clean: straight bars and thin, even lines.
export type Decoration = "scribble" | "clean";
export type BadgeStyle = "circle" | "square" | "ring" | "numeral";
export type NoteStyle = "sticky" | "card" | "pill" | "plain";
// pill: active word on an accent pill. outline: white text with a dark outline.
// box: the line sits on an ink box. minimal: no box, active word underlined.
export type CaptionStyle = "pill" | "outline" | "box" | "minimal";
// How *emphasized* words are drawn in on-screen text.
export type EmphasisStyle = "color" | "marker" | "underline";

export type NamedPalette = { readonly name: string; readonly label: string; readonly colors: Palette };

export type Look = {
  readonly id: LookId;
  readonly name: string;
  readonly description: string;
  // The first palette is the look's default; the editor offers the rest as swaps.
  readonly palettes: readonly [NamedPalette, ...NamedPalette[]];
  readonly fonts: { readonly display: FontChoice; readonly caption: FontChoice };
  readonly type: TypeScale;
  readonly motion: Motion;
  readonly background: BackgroundKind;
  readonly decoration: Decoration;
  // Opacity of the clean outro band drawn in the highlight color (default 0.55). Dark or strongly
  // colored papers want it lower or fully opaque so it does not mix into an off-palette color.
  readonly markOpacity?: number;
  readonly badge: BadgeStyle;
  readonly note: NoteStyle;
  readonly captions: CaptionStyle;
  readonly emphasis: EmphasisStyle;
};

// A look with its palette picked and its fonts loaded, ready for the scenes to draw.
export type ResolvedLook = Omit<Look, "palettes" | "fonts"> & {
  readonly palette: Palette;
  readonly paletteName: string;
  readonly fonts: { readonly display: string; readonly displayWeight: number; readonly caption: string; readonly captionWeight: number };
};
