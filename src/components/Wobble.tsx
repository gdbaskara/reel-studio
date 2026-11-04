import type { ReactNode } from "react";
import { random, useCurrentFrame } from "remotion";
import { useLook } from "../ThemeContext";

type Props = { readonly children: ReactNode; readonly seed: string };

// Hand-drawn "line boil": a tiny jitter that changes a few times per second. Its strength comes from the look.
export const Wobble = ({ children, seed }: Props) => {
  const amount = useLook().motion.wobble;
  const step = Math.floor(useCurrentFrame() / 5);
  const rotate = (random(`${seed}-r-${step}`) - 0.5) * amount;
  const shift = (random(`${seed}-x-${step}`) - 0.5) * amount * 2;
  return <div style={{ transform: `rotate(${rotate}deg) translateX(${shift}px)` }}>{children}</div>;
};
