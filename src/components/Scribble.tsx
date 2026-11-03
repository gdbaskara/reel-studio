import { Easing, interpolate, useCurrentFrame } from "remotion";
import { useTheme } from "../ThemeContext";

type Props = {
  readonly path: string;
  readonly viewBox: string;
  readonly width: number;
  readonly delay?: number;
  readonly duration?: number;
  readonly color?: string;
  readonly strokeWidth?: number;
};

// Draws an SVG path as if by marker, using a normalised dash offset.
export const Scribble = ({
  path,
  viewBox,
  width,
  delay = 0,
  duration = 20,
  color,
  strokeWidth = 10,
}: Props) => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <svg viewBox={viewBox} width={width} style={{ overflow: "visible" }}>
      <path
        d={path}
        pathLength={1}
        fill="none"
        stroke={color ?? theme.ink}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};
