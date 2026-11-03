import { useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../ThemeContext";

export const ProgressBar = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const theme = useTheme();
  return (
    <div style={{ position: "absolute", left: 0, bottom: 0, height: 14, width: `${(frame / durationInFrames) * 100}%`, backgroundColor: theme.accent }} />
  );
};
