import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { parseEmphasis } from "../looks/emphasis";
import { fitScale, TEXT_WIDTH } from "../looks/fit";
import type { ResolvedLook } from "../looks/types";
import { useLook } from "../ThemeContext";

type Props = {
  readonly text: string;
  readonly delay?: number;
  readonly fontSize: number;
  readonly color?: string;
  readonly align?: "center" | "left";
};

// How an *emphasized* word stands out, per the look's emphasis style.
export const strongStyle = (look: ResolvedLook, color: string | undefined, fontSize: number): CSSProperties => {
  const { palette } = look;
  switch (look.emphasis) {
    case "marker":
      return { backgroundColor: palette.highlight, color: palette.ink, padding: `0 ${fontSize * 0.08}px`, borderRadius: fontSize * 0.06 };
    case "underline":
      return { textDecoration: "underline", textDecorationColor: palette.accent, textDecorationThickness: Math.max(4, fontSize * 0.07), textUnderlineOffset: fontSize * 0.12 };
    case "color":
      return { color: color === palette.accent ? palette.ink : palette.accent };
  }
};

// Resolves once the font is registered and loaded. Looks register their font faces lazily, so
// right after mount the face may not exist yet and fonts.load would resolve at once with nothing.
const fontReady = async (spec: string, text: string, triesLeft = 60): Promise<void> => {
  const faces = await document.fonts.load(spec, text);
  if (faces.length > 0 || triesLeft <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, 50));
  return fontReady(spec, text, triesLeft - 1);
};

// Shrinks the text when its widest word would not fit, once the look's font has loaded.
// Rendering waits for the measurement, so every frame uses the fitted size.
const useFit = (text: string, fontSize: number, font: string, weight: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(1);
  const current = useRef(fit);
  current.current = fit;
  useLayoutEffect(() => {
    const handle = delayRender(`Fitting "${text.slice(0, 30)}"`);
    let done = false;
    const finish = () => {
      if (!done) continueRender(handle);
      done = true;
    };
    // Wait for this exact font: measuring with a fallback font would under-estimate the width.
    fontReady(`${weight} ${fontSize}px ${font}`, text).then(() => {
      const spans = [...(ref.current?.children ?? [])] as HTMLElement[];
      // Measured at the size currently drawn, so divide by it to get the full-size width.
      const widest = Math.max(0, ...spans.map((el) => el.offsetWidth + parseFloat(getComputedStyle(el).marginRight || "0"))) / current.current;
      setFit(fitScale(widest, TEXT_WIDTH));
      finish();
    }, finish);
    return finish;
  }, [text, fontSize, font, weight]);
  return { ref, size: fontSize * fit };
};

// Each word springs up and in, one after another, like it is being said.
export const PopWords = ({ text, delay = 0, fontSize: fullSize, color, align = "center" }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const look = useLook();
  const { motion, type } = look;
  const words = parseEmphasis(text);
  const { ref, size: fontSize } = useFit(text, fullSize, look.fonts.display, look.fonts.displayWeight);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "left" ? "flex-start" : "center",
        fontSize,
        color,
        lineHeight: type.lineHeight,
        ...(type.letterSpacing ? { letterSpacing: `${type.letterSpacing}em` } : {}),
        ...(type.uppercase ? { textTransform: "uppercase" } : {}),
        ...(look.fonts.displayWeight !== 400 ? { fontWeight: look.fonts.displayWeight } : {}),
      }}
    >
      {words.map((word, i) => {
        const progress = spring({ frame: frame - delay - i * motion.stagger, fps, config: motion.word });
        return (
          <span
            key={`${word.text}-${i}`}
            style={{
              display: "inline-block",
              marginRight: fontSize * 0.25,
              opacity: Math.min(progress * 1.5, 1),
              transform: `translateY(${(1 - progress) * motion.rise}px) scale(${motion.scaleFrom + progress * (1 - motion.scaleFrom)})`,
              ...(word.strong ? strongStyle(look, color, fontSize) : {}),
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
