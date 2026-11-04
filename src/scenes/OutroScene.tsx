import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { ReelSpec } from "../types";
import { FadeOut } from "../components/FadeOut";
import { OutroMark, TitleMark } from "../components/Marks";
import { PopWords } from "../components/PopWords";
import { TEXT_WIDTH } from "../looks/fit";
import { Wobble } from "../components/Wobble";

type Outro = ReelSpec["outro"];
type Props = { readonly outro: Outro; readonly duration: number };

// The original layout: the big line in the accent colour inside its mark, the small line under it.
const Center = ({ outro }: { readonly outro: Outro }) => {
  const { palette, type, motion, decoration } = useLook();
  const mark = (
    <div style={{ position: "absolute", inset: -40, display: "flex", justifyContent: "center", alignItems: "center", ...(decoration === "clean" ? { zIndex: -1 } : {}) }}>
      <OutroMark delay={motion.delays.outroMark} />
    </div>
  );
  return (
    <>
      <div style={{ height: 260 }} />
      <Wobble seed="outro">
        <div style={{ position: "relative", padding: "40px 0", ...(decoration === "clean" ? { isolation: "isolate" } : {}) }}>
          {decoration === "clean" ? mark : null}
          <PopWords text={outro.main} fontSize={type.outroMain} delay={motion.delays.outroMain} color={palette.accent} />
          {decoration === "scribble" ? mark : null}
        </div>
        <div style={{ marginTop: 120 }}>
          <PopWords text={outro.sub} fontSize={type.outroSub} delay={motion.delays.outroSub} />
        </div>
      </Wobble>
    </>
  );
};

// Both lines on the left edge with a short bar between them.
const Left = ({ outro }: { readonly outro: Outro }) => {
  const { palette, type, motion } = useLook();
  return (
    <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ height: 300 }} />
      <Wobble seed="outro">
        <PopWords text={outro.main} fontSize={type.outroMain} delay={motion.delays.outroMain} color={palette.accent} align="left" />
        <div style={{ margin: "20px 0 60px", alignSelf: "stretch" }}>
          <TitleMark delay={motion.delays.outroMark} align="left" />
        </div>
        <PopWords text={outro.sub} fontSize={type.outroSub} delay={motion.delays.outroSub} align="left" />
      </Wobble>
    </div>
  );
};

const CARD_PADDING = 70;

// Both lines on an accent-coloured card that springs in.
const Card = ({ outro }: { readonly outro: Outro }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette, type, motion } = useLook();
  const pop = spring({ frame, fps, config: motion.badge });
  const inner = TEXT_WIDTH - CARD_PADDING * 2;
  return (
    <>
      <div style={{ height: 220 }} />
      <div
        style={{
          width: TEXT_WIDTH,
          boxSizing: "border-box",
          padding: `${CARD_PADDING}px ${CARD_PADDING}px`,
          borderRadius: 56,
          backgroundColor: palette.accent,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          transform: `scale(${0.8 + 0.2 * pop})`,
          opacity: Math.min(1, pop * 1.5),
        }}
      >
        <PopWords text={outro.main} fontSize={type.outroMain} delay={motion.delays.outroMain} color={palette.onAccent} width={inner} />
        <div style={{ marginTop: 50, opacity: 0.9 }}>
          <PopWords text={outro.sub} fontSize={Math.round(type.outroSub * 0.8)} delay={motion.delays.outroSub} color={palette.onAccent} width={inner} />
        </div>
      </div>
    </>
  );
};

const LAYOUTS = { center: Center, left: Left, card: Card } as const;

export const OutroScene = ({ outro, duration }: Props) => {
  const Layout = LAYOUTS[outro.layout ?? "center"];
  return (
    <FadeOut duration={duration} outro>
      <Layout outro={outro} />
    </FadeOut>
  );
};
