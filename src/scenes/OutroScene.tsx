import { useLook } from "../ThemeContext";
import type { ReelSpec } from "../types";
import { FadeOut } from "../components/FadeOut";
import { OutroMark } from "../components/Marks";
import { PopWords } from "../components/PopWords";
import { Wobble } from "../components/Wobble";

type Props = { readonly outro: ReelSpec["outro"]; readonly duration: number };

export const OutroScene = ({ outro, duration }: Props) => {
  const { palette, type, motion, decoration } = useLook();
  const mark = (
    <div style={{ position: "absolute", inset: -40, display: "flex", justifyContent: "center", alignItems: "center", ...(decoration === "clean" ? { zIndex: -1 } : {}) }}>
      <OutroMark delay={motion.delays.outroMark} />
    </div>
  );
  return (
    <FadeOut duration={duration} outro>
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
    </FadeOut>
  );
};
