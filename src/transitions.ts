import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";
import { LOOKS } from "./looks";
import type { LookId } from "./looks/types";

// How each scene after the first comes in. Every scene still fades out at its end as before, so
// fade adds nothing, and the others never change a scene's length, its voice or its captions.
export const TRANSITIONS = ["fade", "slide", "wipe", "iris"] as const;
export type Transition = (typeof TRANSITIONS)[number];

export const ENTER_FRAMES = 12;

// The editor's choice, else the look's own.
export const transitionOf = (look: LookId | undefined, chosen: Transition | undefined): Transition =>
  chosen ?? (look ? LOOKS[look]?.transition : undefined) ?? "fade";

// 0 when a scene starts entering, 1 once it is fully in. The first scene of a reel is already in.
export const enterProgress = (frame: number, enters: boolean): number =>
  enters ? interpolate(frame, [0, ENTER_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }) : 1;

// Style for a scene's content at progress t; nothing at all once it is fully in.
export const enterStyle = (kind: Transition, t: number): CSSProperties => {
  if (t >= 1 || kind === "fade") return {};
  const hidden = 1 - t;
  switch (kind) {
    case "slide":
      return { transform: `translateX(${Math.round(hidden * 1080)}px)` };
    case "wipe":
      return { clipPath: `inset(0 ${Math.round(hidden * 100)}% 0 0)` };
    case "iris":
      return { clipPath: `circle(${Math.round(t * 120)}% at 50% 40%)` };
  }
};
