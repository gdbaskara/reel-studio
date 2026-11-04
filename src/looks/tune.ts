import type { Look, Motion, Spring, TypeScale } from "./types";

// Fine-tuning on top of a look: text size and how fast things animate in.
export const SPEEDS = ["calm", "normal", "fast"] as const;
export type Speed = (typeof SPEEDS)[number];
export type Tune = { readonly textScale: number; readonly speed: Speed };

export const DEFAULT_TUNE: Tune = { textScale: 1, speed: "normal" };
export const TEXT_SCALE_RANGE = { min: 0.8, max: 1.2 } as const;

// How much quicker than normal each speed plays its entrances.
const PACE: Readonly<Record<Speed, number>> = { calm: 0.75, normal: 1, fast: 1.35 };
// Remotion's spring stiffness when a look leaves it out.
const DEFAULT_STIFFNESS = 100;

export const isDefaultTune = (tune: Tune | undefined): boolean => !tune || (tune.textScale === 1 && tune.speed === "normal");

const scaleType = (type: TypeScale, k: number): TypeScale => ({
  ...type,
  titleLead: Math.round(type.titleLead * k),
  titleMain: Math.round(type.titleMain * k),
  stepTitle: Math.round(type.stepTitle * k),
  note: Math.round(type.note * k),
  outroMain: Math.round(type.outroMain * k),
  outroSub: Math.round(type.outroSub * k),
  badge: Math.round(type.badge * k),
});

// A spring's period goes with 1/sqrt(stiffness), so pace p needs p squared times the stiffness.
const paceSpring = (spring: Spring, p: number): Spring => ({ ...spring, stiffness: Math.round((spring.stiffness ?? DEFAULT_STIFFNESS) * p * p) });

const paceMotion = (motion: Motion, p: number): Motion => ({
  ...motion,
  word: paceSpring(motion.word, p),
  badge: paceSpring(motion.badge, p),
  note: paceSpring(motion.note, p),
  stagger: Math.max(1, Math.round(motion.stagger / p)),
  delays: Object.fromEntries(Object.entries(motion.delays).map(([k, v]) => [k, Math.round(v / p)])) as Motion["delays"],
});

// The look with the tune applied. At the defaults the look itself comes back, so nothing changes.
export const tuneLook = (look: Look, tune: Tune | undefined): Look => {
  if (!tune || isDefaultTune(tune)) return look;
  const pace = PACE[tune.speed];
  return {
    ...look,
    type: tune.textScale === 1 ? look.type : scaleType(look.type, tune.textScale),
    motion: pace === 1 ? look.motion : paceMotion(look.motion, pace),
  };
};
