// Width text may use: the 1080px canvas minus the 80px side padding every scene has (FadeOut).
export const TEXT_WIDTH = 920;

// Scale for a headline so its widest word (measured at full size, with its trailing gap) fits.
// Words never break, so one long word in a wide font would otherwise run off the canvas.
export const fitScale = (widest: number, available: number): number =>
  widest > available && available > 0 ? available / widest : 1;
