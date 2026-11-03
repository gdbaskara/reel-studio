import type { ReactNode } from "react";
import { random, useCurrentFrame } from "remotion";

type Props = { readonly children: ReactNode; readonly seed: string; readonly amount?: number };

// Hand-drawn "line boil": a tiny jitter that changes a few times per second.
export const Wobble = ({ children, seed, amount = 1.2 }: Props) => {
  const step = Math.floor(useCurrentFrame() / 5);
  const rotate = (random(`${seed}-r-${step}`) - 0.5) * amount;
  const shift = (random(`${seed}-x-${step}`) - 0.5) * amount * 2;
  return <div style={{ transform: `rotate(${rotate}deg) translateX(${shift}px)` }}>{children}</div>;
};
