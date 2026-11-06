import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useLook } from "../ThemeContext";
import { CANVAS_HEIGHT, CONTENT_BOTTOM, useContentTop } from "../layout";
import { drift } from "../life";

type Props = { readonly children: ReactNode; readonly duration: number; readonly outro?: boolean };

// Fades a scene out over its last few frames so cuts feel softer.
export const FadeOut = ({ children, duration, outro = false }: Props) => {
  const frame = useCurrentFrame();
  const { motion } = useLook();
  const top = useContentTop();
  const frames = outro ? motion.outroFadeOut : motion.fadeOut;
  const opacity = interpolate(frame, [duration - frames, duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Content sits in the middle of the band between the top (or brand mark) and the captions,
  // and the whole scene grows slowly so the frame keeps moving while the voice talks.
  return (
    <AbsoluteFill
      style={{
        opacity,
        alignItems: "center",
        padding: `${top}px 80px ${CANVAS_HEIGHT - CONTENT_BOTTOM}px`,
        justifyContent: "center",
        transform: `scale(${drift(frame, duration)})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
