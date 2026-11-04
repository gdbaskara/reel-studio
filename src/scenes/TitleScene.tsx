import { useLook } from "../ThemeContext";
import type { ReelSpec } from "../types";
import { FadeOut } from "../components/FadeOut";
import { TitleMark } from "../components/Marks";
import { PopWords } from "../components/PopWords";
import { Wobble } from "../components/Wobble";

type Props = { readonly title: ReelSpec["title"]; readonly duration: number };

export const TitleScene = ({ title, duration }: Props) => {
  const { palette, type, motion } = useLook();
  return (
    <FadeOut duration={duration}>
      <div style={{ height: 220 }} />
      <Wobble seed="title">
        <PopWords text={title.lead} fontSize={type.titleLead} delay={motion.delays.titleLead} />
        <PopWords text={title.main} fontSize={type.titleMain} delay={motion.delays.titleMain} color={palette.accent} />
      </Wobble>
      <div style={{ marginTop: 10 }}>
        <TitleMark delay={motion.delays.titleMark} />
      </div>
    </FadeOut>
  );
};
