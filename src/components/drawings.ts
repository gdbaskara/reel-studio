import type { Drawing } from "../types";

export type Shape = { readonly path: string; readonly viewBox: string; readonly width: number };

export const UNDERLINE: Shape = {
  viewBox: "0 0 740 60",
  width: 780,
  path: "M10 34 Q 130 8 250 30 T 490 28 T 730 32",
};

export const DRAWINGS: Readonly<Record<Drawing, Shape>> = {
  arrow: { viewBox: "0 0 300 320", width: 240, path: "M120 20 C 40 120, 230 170, 150 290 M95 245 L150 292 L205 240" },
  circle: {
    viewBox: "0 0 620 320",
    width: 520,
    path: "M330 50 C 130 30, 20 130, 80 220 C 150 310, 500 300, 570 190 C 620 100, 450 20, 250 70",
  },
  zigzag: { viewBox: "0 0 660 140", width: 520, path: "M20 110 L120 30 L220 110 L320 30 L420 110 L520 30 L640 110" },
  check: { viewBox: "0 0 300 240", width: 260, path: "M30 130 L110 210 L280 30" },
  star: {
    viewBox: "0 0 300 290",
    width: 260,
    path: "M150 15 L188 105 L285 112 L210 175 L235 272 L150 220 L65 272 L90 175 L15 112 L112 105 Z",
  },
};
