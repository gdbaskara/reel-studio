import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { ReelSpec } from "../types";
import { FadeOut } from "../components/FadeOut";
import { TitleMark } from "../components/Marks";
import { PopWords } from "../components/PopWords";
import { Wobble } from "../components/Wobble";
import { plainText } from "../looks/emphasis";

type Title = ReelSpec["title"];
type Props = { readonly title: Title; readonly duration: number };

// The original layout: both lines centred, the big one in the accent colour, with a mark under them.
const Center = ({ title }: { readonly title: Title }) => {
  const { palette, type, motion } = useLook();
  return (
    <>
      <div style={{ height: 220 }} />
      <Wobble seed="title">
        <PopWords text={title.lead} fontSize={type.titleLead} delay={motion.delays.titleLead} />
        <PopWords text={title.main} fontSize={type.titleMain} delay={motion.delays.titleMain} color={palette.accent} />
      </Wobble>
      <div style={{ marginTop: 10 }}>
        <TitleMark delay={motion.delays.titleMark} />
      </div>
    </>
  );
};

// The same lines lined up on the left edge.
const Left = ({ title }: { readonly title: Title }) => {
  const { palette, type, motion } = useLook();
  return (
    <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ height: 220 }} />
      <Wobble seed="title">
        <PopWords text={title.lead} fontSize={type.titleLead} delay={motion.delays.titleLead} align="left" />
        <PopWords text={title.main} fontSize={type.titleMain} delay={motion.delays.titleMain} color={palette.accent} align="left" />
      </Wobble>
      <div style={{ marginTop: 10, alignSelf: "stretch" }}>
        <TitleMark delay={motion.delays.titleMark} align="left" />
      </div>
    </div>
  );
};

// The small line becomes a coloured tag that pops in above a larger big line.
const Label = ({ title }: { readonly title: Title }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { palette, type, motion, fonts } = useLook();
  const pop = spring({ frame: frame - motion.delays.titleLead, fps, config: motion.badge });
  return (
    <>
      <div style={{ height: 200 }} />
      {title.lead.trim() ? (
        <div
          style={{
            padding: "16px 40px",
            borderRadius: 999,
            backgroundColor: palette.accent,
            color: palette.onAccent,
            fontFamily: fonts.caption,
            fontWeight: fonts.captionWeight,
            fontSize: Math.round(type.titleLead * 0.5),
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 40,
            transform: `scale(${pop})`,
          }}
        >
          {plainText(title.lead)}
        </div>
      ) : null}
      <Wobble seed="title">
        <PopWords text={title.main} fontSize={Math.round(type.titleMain * 1.1)} delay={motion.delays.titleMain} />
      </Wobble>
      <div style={{ marginTop: 10 }}>
        <TitleMark delay={motion.delays.titleMark} />
      </div>
    </>
  );
};

const LAYOUTS = { center: Center, left: Left, label: Label } as const;

export const TitleScene = ({ title, duration }: Props) => {
  const Layout = LAYOUTS[title.layout ?? "center"];
  return (
    <FadeOut duration={duration}>
      <Layout title={title} />
    </FadeOut>
  );
};
