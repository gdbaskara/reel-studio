import { DRAWINGS, type Plan } from "../../shared/project";
import { LOOKS } from "../../../src/looks";
import { LOOK_IDS } from "../../../src/looks/types";
import { activePalette, type Style } from "./style";

// Parts of the look that Shuffle leaves alone. The palette lock only counts while the look is locked,
// because palettes belong to a look.
export type Locks = { readonly look: boolean; readonly palette: boolean; readonly doodles: boolean };
export const NO_LOCKS: Locks = { look: false, palette: false, doodles: false };

export type Random = () => number;
export type Shuffled = { readonly style: Style; readonly plan: Plan };

// One of items, preferring anything other than avoid.
const pick = <T>(items: readonly T[], random: Random, avoid?: T): T => {
  const others = items.filter((item) => item !== avoid);
  const pool = others.length ? others : items;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
};

const paletteNames = (style: Pick<Style, "look">) => LOOKS[style.look].palettes.map((p) => p.name);

const paletteLocked = (style: Style, locks: Locks) => locks.palette || paletteNames(style).length < 2;

export const canShuffle = (style: Style, locks: Locks): boolean => !(locks.look && paletteLocked(style, locks) && locks.doodles);

const shuffledLook = (style: Style, locks: Locks, random: Random): Style => {
  if (!locks.look) {
    const look = pick(LOOK_IDS, random, style.look);
    return { ...style, look, palette: pick(paletteNames({ look }), random) };
  }
  if (locks.palette) return style;
  return { ...style, palette: pick(paletteNames(style), random, activePalette(style)) };
};

const shuffledDoodles = (plan: Plan, random: Random): Plan => ({
  ...plan,
  steps: plan.steps.map((step) => ({ ...step, drawing: pick(DRAWINGS, random, step.drawing) })),
});

// A new look, palette and set of doodles, changing only what is not locked. Text, voices,
// captions, progress bar and music stay as they are.
export const shuffleStyle = (style: Style, plan: Plan, locks: Locks, random: Random = Math.random): Shuffled => ({
  style: shuffledLook(style, locks, random),
  plan: locks.doodles ? plan : shuffledDoodles(plan, random),
});

// Puts back the look, palette and doodles from before a shuffle, keeping every other edit made since.
// Steps added after the shuffle keep their doodle.
export const undoShuffle = (before: Shuffled, current: Shuffled): Shuffled => ({
  style: { ...current.style, look: before.style.look, palette: before.style.palette },
  plan: {
    ...current.plan,
    steps: current.plan.steps.map((step, i) => {
      const earlier = before.plan.steps[i];
      return earlier ? { ...step, drawing: earlier.drawing } : step;
    }),
  },
});
