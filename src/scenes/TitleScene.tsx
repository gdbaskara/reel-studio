import { useTheme } from "../ThemeContext";
import type { ReelSpec } from "../types";
import { FadeOut } from "../components/FadeOut";
import { PopWords } from "../components/PopWords";
import { Scribble } from "../components/Scribble";
import { Wobble } from "../components/Wobble";
import { UNDERLINE } from "../components/drawings";

type Props = { readonly title: ReelSpec["title"]; readonly duration: number };

export const TitleScene = ({ title, duration }: Props) => {
  const theme = useTheme();
  return (
    <FadeOut duration={duration}>
      <div style={{ height: 220 }} />
      <Wobble seed="title">
        <PopWords text={title.lead} fontSize={150} delay={4} />
        <PopWords text={title.main} fontSize={210} delay={18} color={theme.accent} />
      </Wobble>
      <div style={{ marginTop: 10 }}>
        <Scribble {...UNDERLINE} delay={34} duration={22} strokeWidth={14} />
      </div>
    </FadeOut>
  );
};
