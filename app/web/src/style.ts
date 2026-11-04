import { DEFAULT_BRAND_POSITION, musicSettings, type Brand, type CreateOptions, type MusicSettings, type Project } from "../../shared/project";
import { toReelProps } from "../../shared/toReel";
import { DEFAULT_LOOK, firstPaletteOf, lookChoice } from "../../../src/looks";
import type { LookId } from "../../../src/looks/types";
import type { ReelProps } from "../../../src/types";
import type { Transition } from "../../../src/transitions";
import { buildScenes } from "../../../src/timeline";

// Everything about how a reel looks that the editor saves alongside the plan.
// Its fields match the project options and the update request, so it spreads into both.
export type Style = {
  readonly look: LookId;
  readonly palette: string;
  readonly captions: boolean;
  readonly progressBar: boolean;
  readonly brand: Brand;
  // null follows the look's own transition.
  readonly transition: Transition | null;
  readonly music: MusicSettings;
};

export const NO_BRAND: Brand = { handle: "", position: DEFAULT_BRAND_POSITION };

// A look and palette shown on the player while hovering, without being saved.
export type StyleOverride = Pick<Style, "look" | "palette">;

export const styleOf = (options: CreateOptions): Style => ({
  look: options.look ?? DEFAULT_LOOK,
  palette: options.palette,
  captions: options.captions,
  progressBar: options.progressBar ?? true,
  brand: options.brand ?? NO_BRAND,
  transition: options.transition ?? null,
  music: musicSettings(options),
});

export const firstPalette = firstPaletteOf;

// Switching looks starts from the new look's first palette, since palette names belong to a look.
export const withLook = (style: Style, look: LookId): Style => ({ ...style, look, palette: firstPalette(look) });

// The palette the reel actually uses, after unknown names fall back to the look's first.
export const activePalette = (style: Pick<Style, "look" | "palette">): string => lookChoice(style.look, style.palette).paletteName;

// The project as the editor shows it with this style, before it is saved.
export const applyStyle = (project: Project, style: Style): Project => {
  const { transition, ...rest } = style;
  const { transition: _saved, ...options } = project.options;
  return { ...project, options: { ...options, ...rest, ...(transition ? { transition } : {}) } };
};

// A frame of the title scene where its words have animated in.
export const TILE_FRAME = 45;

// Props for a still of the title scene in a look, for the look picker tiles. Other looks show their
// first palette; pass the reel's palette for the look it already uses. Music is left out: a still never plays it.
export const titleTile = (project: Project, look: LookId, palette?: string) => {
  const style = withLook(styleOf(project.options), look);
  const { music: _music, ...props }: ReelProps = toReelProps(applyStyle(project, palette ? { ...style, palette } : style));
  const frames = buildScenes(props.spec, props.voice)[0]?.frames ?? 1;
  return { inputProps: { ...props, sceneIndex: 0 }, durationInFrames: frames, frame: Math.min(TILE_FRAME, frames - 1) };
};
