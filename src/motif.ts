// Where the faint motif drawings sit behind the scenes: a loose grid with a little jitter and tilt,
// a few rows taller than the canvas so the layer can drift upward without running out.
export const MOTIF_COLUMNS = 4;
export const MOTIF_CELL = 270;
const MOTIF_ROWS = 10;
const JITTER = 40;
const MAX_TILT = 18;

export type MotifTile = { readonly x: number; readonly y: number; readonly rotate: number; readonly index: number };

// A fixed pseudo-random number in 0..1 per seed, so every frame and every render agree.
const pseudo = (seed: number) => {
  const v = Math.sin(seed * 12.9898) * 43758.5453;
  return v - Math.floor(v);
};

// index picks which drawing a tile shows; shifting it per row keeps neighbours different.
export const motifTiles = (count: number): readonly MotifTile[] =>
  Array.from({ length: MOTIF_ROWS * MOTIF_COLUMNS }, (_, i) => {
    const row = Math.floor(i / MOTIF_COLUMNS);
    const col = i % MOTIF_COLUMNS;
    // Odd rows shift half a cell, so the drawings do not line up in columns.
    const offset = row % 2 ? MOTIF_CELL / 2 : 0;
    return {
      x: ((col * MOTIF_CELL + offset + MOTIF_CELL / 2) % (MOTIF_COLUMNS * MOTIF_CELL)) + (pseudo(i + 1) - 0.5) * 2 * JITTER,
      y: row * MOTIF_CELL + MOTIF_CELL / 2 + (pseudo(i + 101) - 0.5) * 2 * JITTER,
      rotate: (pseudo(i + 201) - 0.5) * 2 * MAX_TILT,
      index: (row * 2 + col) % Math.max(1, count),
    };
  });
