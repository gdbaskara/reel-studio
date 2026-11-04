import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useLook } from "../ThemeContext";

type Props = { readonly children: ReactNode; readonly duration: number; readonly outro?: boolean };

// Fades a scene out over its last few frames so cuts feel softer.
export const FadeOut = ({ children, duration, outro = false }: Props) => {
  const frame = useCurrentFrame();
  const { motion } = useLook();
  const frames = outro ? motion.outroFadeOut : motion.fadeOut;
  const opacity = interpolate(frame, [duration - frames, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity, alignItems: "center", padding: "240px 80px 0", justifyContent: "flex-start" }}>{children}</AbsoluteFill>;
};
