import type { Plan } from "../../shared/project";
import type { Proposal } from "../../shared/restyle";
import { LOOKS } from "../../../src/looks";
import type { LookId } from "../../../src/looks/types";
import type { Style } from "./style";

const paletteOf = (look: LookId, name: string | undefined): string | undefined =>
  name && LOOKS[look].palettes.some((p) => p.name === name) ? name : undefined;

// The style and plan with a proposal applied. A palette must belong to the resulting look: with a new
// look it falls back to that look's first palette, without one it is ignored.
export const applyProposal = (style: Style, plan: Plan, proposal: Proposal): { readonly style: Style; readonly plan: Plan } => {
  const look = proposal.look ?? style.look;
  const palette = proposal.look ? paletteOf(look, proposal.palette) ?? LOOKS[look].palettes[0].name : paletteOf(look, proposal.palette) ?? style.palette;
  const changed =
    proposal.look !== undefined || proposal.palette !== undefined || proposal.transition !== undefined || proposal.tune !== undefined;
  const nextStyle: Style = changed
    ? { ...style, look, palette, ...(proposal.transition ? { transition: proposal.transition } : {}), ...(proposal.tune ? { tune: proposal.tune } : {}) }
    : style;
  const layouts = proposal.layouts;
  const nextPlan: Plan =
    layouts && (layouts.title || layouts.steps || layouts.outro)
      ? {
          ...plan,
          title: layouts.title ? { ...plan.title, layout: layouts.title } : plan.title,
          outro: layouts.outro ? { ...plan.outro, layout: layouts.outro } : plan.outro,
          steps: layouts.steps ? plan.steps.map((step) => ({ ...step, layout: layouts.steps })) : plan.steps,
        }
      : plan;
  return { style: nextStyle, plan: nextPlan };
};

export type QuickStyle = { readonly id: string; readonly label: string; readonly propose: (style: Style) => Proposal };

const isLoud = (look: LookId) => look === "bold-pop" || look === "neon";

// One-click directions that need no AI. Each keeps the look when it already fits the direction.
export const QUICK_STYLES: readonly QuickStyle[] = [
  {
    id: "calmer",
    label: "Calmer",
    propose: (style) => ({
      ...(isLoud(style.look) ? { look: "minimal" as const } : {}),
      transition: "fade",
      tune: { textScale: Math.min(style.tune.textScale, 1), speed: "calm" },
      summary: "Slower, softer entrances and fades",
    }),
  },
  {
    id: "bolder",
    label: "Bolder",
    propose: (style) => ({
      ...(isLoud(style.look) ? {} : { look: "bold-pop" as const }),
      transition: "slide",
      tune: { textScale: Math.max(style.tune.textScale, 1.1), speed: "fast" },
      layouts: { steps: "big-number" },
      summary: "Bigger type, big step numbers and fast slides",
    }),
  },
  {
    id: "neater",
    label: "Neater",
    propose: (style) => ({
      ...(style.look === "minimal" || style.look === "koran" ? {} : { look: "minimal" as const }),
      transition: "wipe",
      tune: { textScale: style.tune.textScale, speed: "normal" },
      layouts: { title: "left", steps: "left", outro: "left" },
      summary: "Clean type, everything lined up on the left",
    }),
  },
  {
    id: "playful",
    label: "Playful",
    propose: (style) => ({
      ...(style.look === "pastel" || style.look === "notebook" ? {} : { look: "pastel" as const }),
      transition: "slide",
      tune: { textScale: style.tune.textScale, speed: "fast" },
      layouts: { title: "label", outro: "card" },
      summary: "Soft colours, a title tag and a card to finish",
    }),
  },
];
