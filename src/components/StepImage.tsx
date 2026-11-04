import { Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { Step } from "../types";

// Never wider than the text column, and never taller than this even with room to spare.
export const IMAGE_MAX = { width: 880, height: 560 } as const;

type Props = { readonly image: NonNullable<Step["image"]>; readonly delay: number; readonly align?: "center" | "left" };

// A picture in a rounded frame with the look's ink edge, popping in like the note. It takes the room
// left between the title and the note (see StepScene), so long titles and notes shrink it rather than
// pushing the note into the captions.
export const StepImage = ({ image, delay, align = "center" }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { motion, palette } = useLook();
  const pop = spring({ frame: frame - delay, fps, config: motion.note });
  return (
    <div
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        marginTop: 40,
        display: "flex",
        justifyContent: align === "left" ? "flex-start" : "center",
        alignItems: "flex-start",
        alignSelf: "stretch",
        opacity: Math.min(1, pop * 1.5),
        transform: `scale(${0.85 + 0.15 * pop})`,
      }}
    >
      <Img
        src={image.src}
        width={image.width}
        height={image.height}
        style={{
          boxSizing: "border-box",
          maxWidth: IMAGE_MAX.width,
          maxHeight: `min(100%, ${IMAGE_MAX.height}px)`,
          width: "auto",
          height: "auto",
          borderRadius: 28,
          border: `5px solid ${palette.ink}`,
          boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
          backgroundColor: palette.paper,
        }}
      />
    </div>
  );
};
