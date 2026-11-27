/**
 * "Grade da semana" page transition: tiles in the category colors cover the
 * screen in a diagonal wave, the page changes underneath, and the tiles clear
 * away in the same wave. Used when going from the public pages to the login,
 * the sign-up or the app (the entrance), not for every click inside the app.
 *
 * Plain DOM + Web Animations (no React state), on top of everything, and it
 * blocks clicks while it runs. Reduced motion: the page just changes.
 */
const TILE = 88; // px, about the size of a spreadsheet block on screen
const WAVE = 380; // ms for the wave to cross the screen
const IN = 260;
const OUT = 280;
const EASE = "cubic-bezier(.2,.8,.2,1)";
/** Solid colors only (--selected is translucent in the dark theme and let the page show through). */
const COLORS = ["var(--accent)", "var(--ink)", "var(--cat-commute)", "var(--cat-study)", "var(--cat-class)", "var(--cat-work)"];

let running = false;

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function buildOverlay() {
  const cols = Math.ceil(window.innerWidth / TILE);
  const rows = Math.ceil(window.innerHeight / TILE);
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "200",
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    pointerEvents: "auto",
  });
  const tiles = [];
  for (let i = 0; i < cols * rows; i++) {
    const tile = document.createElement("span");
    const c = i % cols;
    const r = (i - c) / cols;
    // square corners and a little overlap when full, so no gap ever shows the page behind
    // colors in diagonal stripes on any screen (the old i-based index went straight on 5-column phones)
    const color = COLORS[(((c - r) % COLORS.length) + COLORS.length) % COLORS.length];
    Object.assign(tile.style, { background: color, transform: "scale(0)" });
    tile.dataset.delay = String(((c + r) / Math.max(1, cols + rows - 2)) * WAVE);
    overlay.appendChild(tile);
    tiles.push(tile);
  }
  document.body.appendChild(overlay);
  return { overlay, tiles };
}

const wave = (tiles, from, to, duration, easing) =>
  Promise.all(tiles.map((t) => t.animate([{ transform: from }, { transform: to }], { duration, delay: Number(t.dataset.delay), easing, fill: "forwards" }).finished));

/**
 * Covers the screen, runs `change` (navigate, may return a promise), waits for
 * the new page to paint, then clears the tiles away.
 */
export async function withGridTransition(change) {
  if (running || reduced()) return change();
  running = true;
  const { overlay, tiles } = buildOverlay();
  try {
    await wave(tiles, "scale(0)", "scale(1.08)", IN, EASE);
    await change();
    window.scrollTo(0, 0);
    await nextPaint();
    await wave(tiles, "scale(1.08)", "scale(0)", OUT, "ease-in");
  } finally {
    overlay.remove();
    running = false;
  }
  return undefined;
}

/** Shortest time the loading tiles stay on screen, counted from when the page started opening. */
const BOOT_MIN_MS = 500;

/**
 * Clears the loading screen (#boot in index.html: the same tiles, already
 * covering the screen) in the diagonal wave, once the first page is ready and
 * at least BOOT_MIN_MS after the page started opening. With the opening
 * animation playing or reduced motion it just goes away.
 */
export async function finishBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  if (document.documentElement.hasAttribute("data-intro") || reduced() || !boot.children.length) {
    boot.remove();
    return;
  }
  const wait = BOOT_MIN_MS - performance.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  await nextPaint();
  const tiles = [...boot.children];
  const cols = Number(boot.dataset.cols) || 1;
  const rows = Math.ceil(tiles.length / cols);
  tiles.forEach((tile, i) => {
    const c = i % cols;
    tile.dataset.delay = String(((c + (i - c) / cols) / Math.max(1, cols + rows - 2)) * WAVE);
  });
  boot.style.background = "transparent";
  boot.style.pointerEvents = "none";
  try {
    await wave(tiles, "scale(1.08)", "scale(0)", OUT, "ease-in");
  } finally {
    boot.remove();
  }
}
