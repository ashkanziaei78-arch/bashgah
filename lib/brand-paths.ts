/** The Fit Club mark as vector paths, in a 650-unit square
 *  (viewBox "-10 -10 650 650"). Shared by the on-screen logo and the
 *  icon generator so the two can never drift apart. Redrawn from the
 *  brand artwork: three slanted bars forming an F, a runner whose
 *  body is the F's stem, and the head as the dot. */
export const LOGO_VIEWBOX = "-10 -10 650 650";
export const LOGO_BODY = "M40 290 C112 233 220 176 318 160 C345 156 364 172 359 196 C357 206 351 214 344 222 L97 590 C82 613 57 626 31 622 C8 618 0 599 11 584 L221 262 C150 263 96 272 40 290 Z";
export const LOGO_BARS = [
  "M35 272 C48 178 70 96 112 50 C140 19 175 5 215 5 L612 5 C626 5 632 17 625 29 L566 126 C548 154 520 167 482 167 L442 167 L330 160 C230 160 120 212 35 272 Z",
  "M255 385 L328 280 C336 270 346 265 360 265 L578 265 C592 265 598 277 591 289 L535 365 C522 380 507 385 490 385 Z",
  "M30 625 L207 437 C214 430 222 425 233 425 L352 425 C366 425 371 437 363 449 L230 600 C214 618 196 625 175 625 Z",
];
export const LOGO_HEAD = { cx: 400, cy: 118, r: 61 };
/** Blue at each bar's lower-left into green at its right. */
export const LOGO_STOPS: [number, string][] = [
  [0, "#0a50d2"],
  [0.28, "#05a0e4"],
  [0.6, "#0cc6b6"],
  [1, "#22e874"],
];
export const LOGO_HEAD_STOPS: [number, string][] = [
  [0, "#22f0d0"],
  [1, "#14d68a"],
];
