import type { CSSProperties } from "react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { useLook } from "../ThemeContext";
import type { BrandMark as Mark } from "../types";

// Clear of the platform's top bar on a 1080x1920 reel, and of the side edges.
const TOP = 110;
const SIDE = 64;
const LOGO_HEIGHT = 80;
const HANDLE_SIZE = 40;
const FADE_FRAMES = 10;

const PLACE: Readonly<Record<Mark["position"], CSSProperties>> = {
  "top-left": { left: SIDE, justifyContent: "flex-start" },
  "top-center": { left: SIDE, right: SIDE, justifyContent: "center" },
  "top-right": { right: SIDE, justifyContent: "flex-end" },
};

type Props = {
  readonly brand: Mark;
  // Frames of the reel before this point, so a single-scene preview fades in only where the reel does.
  readonly offset?: number;
};

// A handle and/or logo in a top corner, drawn on a soft pill of the paper colour so it reads on any background.
// Long handles are cut with an ellipsis rather than running off the canvas.
export const BrandMark = ({ brand, offset = 0 }: Props) => {
  const frame = useCurrentFrame();
  const look = useLook();
  const { paper, ink } = look.palette;
  const opacity = interpolate(frame + offset, [0, FADE_FRAMES], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: TOP, display: "flex", maxWidth: 1080 - 2 * SIDE, opacity, ...PLACE[brand.position] }}>
      <div
        style={{
          minWidth: 0,
          maxWidth: "100%",
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: brand.handle ? "10px 26px 10px 14px" : 10,
          borderRadius: 999,
          backgroundColor: `${paper}D9`,
          color: ink,
          fontFamily: look.fonts.caption,
          fontWeight: look.fonts.captionWeight,
          fontSize: HANDLE_SIZE,
        }}
      >
        {brand.logo ? <Img src={brand.logo} style={{ flexShrink: 0, height: LOGO_HEIGHT, maxWidth: LOGO_HEIGHT * 3, objectFit: "contain", borderRadius: 12 }} /> : null}
        {brand.handle ? <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: brand.logo ? 0 : 12 }}>{brand.handle}</span> : null}
      </div>
    </div>
  );
};
