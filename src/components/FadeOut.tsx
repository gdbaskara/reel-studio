import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type Props = { readonly children: ReactNode; readonly duration: number; readonly frames?: number };

// Fades a scene out over its last few frames so cuts feel softer.
export const FadeOut = ({ children, duration, frames = 8 }: Props) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [duration - frames, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity, alignItems: "center", padding: "240px 80px 0", justifyContent: "flex-start" }}>{children}</AbsoluteFill>;
};
