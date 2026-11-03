import { useTheme } from "../ThemeContext";
import type { ReelSpec } from "../types";
import { FadeOut } from "../components/FadeOut";
import { PopWords } from "../components/PopWords";
import { Scribble } from "../components/Scribble";
import { Wobble } from "../components/Wobble";
import { DRAWINGS } from "../components/drawings";

type Props = { readonly outro: ReelSpec["outro"]; readonly duration: number };

export const OutroScene = ({ outro, duration }: Props) => {
  const theme = useTheme();
  return (
    <FadeOut duration={duration} frames={12}>
      <div style={{ height: 260 }} />
      <Wobble seed="outro">
        <div style={{ position: "relative", padding: "40px 0" }}>
          <PopWords text={outro.main} fontSize={140} delay={2} color={theme.accent} />
          <div style={{ position: "absolute", inset: -40, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Scribble {...DRAWINGS.circle} width={1120} delay={6} duration={22} color={theme.accent} />
          </div>
        </div>
        <div style={{ marginTop: 120 }}>
          <PopWords text={outro.sub} fontSize={130} delay={12} />
        </div>
      </Wobble>
    </FadeOut>
  );
};
