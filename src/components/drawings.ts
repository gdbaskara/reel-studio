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
  bulb: {
    viewBox: "0 0 240 320",
    width: 200,
    path: "M85 215 C 25 170, 25 55, 120 38 C 215 55, 215 170, 155 215 L 152 245 L 88 245 Z M88 275 L152 275 M100 302 L140 302 M120 0 L120 12 M30 30 L40 40 M210 30 L200 40",
  },
  clock: {
    viewBox: "0 0 300 300",
    width: 250,
    path: "M150 22 C 75 20, 22 78, 22 150 C 22 224, 80 280, 150 280 C 224 282, 280 222, 280 150 C 280 78, 222 22, 150 22 M150 72 L150 152 L206 188",
  },
  chat: {
    viewBox: "0 0 400 300",
    width: 330,
    path: "M45 40 L355 42 C 378 42, 390 54, 390 76 L388 186 C 388 208, 376 220, 354 220 L170 220 L92 286 L108 220 L44 220 C 22 220, 10 208, 10 186 L12 74 C 12 52, 24 40, 45 40 M88 108 L312 110 M88 158 L246 158",
  },
  stack: {
    viewBox: "0 0 340 290",
    width: 290,
    path: "M40 122 L240 120 L242 272 L42 270 Z M80 120 L82 80 L282 82 L280 230 L242 230 M122 80 L120 40 L320 42 L322 190 L282 190",
  },
  flag: {
    viewBox: "0 0 280 300",
    width: 220,
    path: "M62 292 L58 28 M60 40 C 120 8, 172 72, 242 38 L240 162 C 172 194, 120 128, 60 160",
  },
  magnifier: {
    viewBox: "0 0 300 300",
    width: 250,
    path: "M130 32 C 72 30, 30 76, 30 130 C 30 186, 76 230, 130 230 C 186 230, 230 186, 230 130 C 230 74, 186 32, 130 32 M202 202 L288 288 M90 120 C 96 96, 110 84, 132 80",
  },
};
