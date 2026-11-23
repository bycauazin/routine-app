import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/** Hours with a known light (tokens --sky-HH in index.css); the ones in between are mixed. */
const STOPS = [7, 10, 13, 17, 19, 21, 23];
const CATS = ["--cat-personal", "--cat-commute", "--cat-work", "--cat-meal", "--cat-work", "--cat-class", "--cat-workout", "--cat-study"];
/** The day as a skyline: [from hour, to hour, height (0–1), category]. */
const BLOCKS = [
  [7, 8, 0.28, 0],
  [8, 9, 0.38, 1],
  [9, 13, 0.66, 2],
  [13, 14, 0.32, 3],
  [14, 18, 0.74, 4],
  [18.5, 19.5, 0.46, 5],
  [20, 21, 0.42, 6],
  [21, 23, 0.52, 7],
];
const NIGHT_FROM = 19.5;

const toRgb = (color) => {
  const hex = color.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
};
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Hours of the day in São Paulo right now, as a number (14.5 = 14:30). */
function hourNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [h, m] = parts.split(":").map(Number);
  return h + m / 60;
}

/**
 * "Céu do dia", a window on the right of the hero: its light follows the hour
 * of the pointer over the hero, from dawn (left edge) to night (right edge).
 * The sun travels an arc and turns into the moon after dark; at the bottom the
 * blocks of a day stand like a skyline with navy windows (creme in the dark
 * theme), the block of "now" in pink. With no pointer for a while, the day
 * goes by on its own.
 * Performance: a few shapes per frame, the loop starts after the page has
 * loaded, and it pauses off-screen and in a hidden tab. Reduced motion: a
 * still picture of the current hour.
 */
export function SkyDay({ className }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let c = { stops: [], moon: [0, 0, 0], page: [0, 0, 0], pink: "", deep: "", ink: "", rule: "", edge: "", cats: [] };
    let hour = Math.min(22.9, Math.max(7, hourNow()));
    const ptr = { x: -1, last: -1e9 };
    let visible = true;
    let raf = 0;
    let prev = performance.now();

    const readColors = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (n) => s.getPropertyValue(n).trim();
      c = {
        stops: STOPS.map((hh) => toRgb(v(`--sky-${String(hh).padStart(2, "0")}`))),
        moon: toRgb(v("--sky-moon")),
        page: toRgb(v("--bg")),
        pink: v("--accent"),
        deep: v("--accent-text"),
        ink: v("--ink"),
        rule: v("--rule-strong"),
        edge: v("--sky-edge"),
        cats: CATS.map(v),
      };
    };
    const skyAt = (hr) => {
      for (let i = 0; i < STOPS.length - 1; i++) {
        if (hr <= STOPS[i + 1]) return mix(c.stops[i], c.stops[i + 1], Math.min(1, Math.max(0, (hr - STOPS[i]) / (STOPS[i + 1] - STOPS[i]))));
      }
      return c.stops[c.stops.length - 1];
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    const rect = (x, y, ww, hh, r) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, r);
      else ctx.rect(x, y, ww, hh);
    };

    function paint() {
      if (!w || !c.stops.length) return;
      const hr = hour;
      const night = hr > NIGHT_FROM;
      const sky = skyAt(hr);
      ctx.clearRect(0, 0, w, h);

      // the sky: the hour's light at the top, blending into the page color toward the skyline (solid, so the frame never shows through)
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, `rgb(${sky.join(",")})`);
      g.addColorStop(1, `rgb(${mix(sky, c.page, 0.5).join(",")})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // the sun's arc, centered in the window, above the skyline
      const cx = w * 0.5;
      const cy = h * 0.66;
      const rx = w * 0.38;
      const ry = h * 0.5;
      const a = Math.PI + ((hr - 7) / 16) * Math.PI;
      ctx.setLineDash([3, 7]);
      ctx.strokeStyle = c.ink;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // the sun, or the moon after dark
      const sx = cx + Math.cos(a) * rx;
      const sy = cy + Math.sin(a) * ry;
      const glow = night ? c.moon : toRgb(c.pink);
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90);
      halo.addColorStop(0, `rgba(${glow.join(",")},0.75)`);
      halo.addColorStop(1, `rgba(${glow.join(",")},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sx, sy, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = night ? `rgb(${c.moon.join(",")})` : c.pink;
      ctx.fill();
      if (night) {
        ctx.beginPath();
        ctx.arc(sx + 9, sy - 6, 19, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${sky.join(",")})`;
        ctx.fill();
      }
      const label = `${String(Math.floor(hr)).padStart(2, "0")}:${String(Math.floor((hr % 1) * 60)).padStart(2, "0")}`;
      ctx.font = "700 13px 'Inter Variable', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = c.ink;
      ctx.fillText(label, sx, sy + 40);

      // the day as a skyline: soft white edges, navy windows (creme in the dark theme); the block of "now" lights up pink
      const base = h - 1;
      const x = (v) => w * 0.04 + ((v - 7) / 16) * w * 0.92;
      for (const [a0, a1, height, cat] of BLOCKS) {
        const bx = x(a0) + 2;
        const bw = x(a1) - x(a0) - 4;
        const bh = height * h * 0.36;
        const by = base - bh;
        const now = hr >= a0 && hr < a1;
        rect(bx, by, bw, bh + 8, 7);
        ctx.fillStyle = c.cats[cat];
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = now ? c.deep : c.edge;
        ctx.stroke();
        ctx.fillStyle = now ? c.deep : c.ink;
        ctx.globalAlpha = now ? 0.9 : hr > a1 ? 0.75 : 0.32;
        for (let wy = by + 10; wy < base - 8; wy += 15) for (let wx = bx + 7; wx < bx + bw - 9; wx += 13) ctx.fillRect(wx, wy, 6, 7);
        ctx.globalAlpha = 1;
      }
    }

    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      if (!visible || document.hidden) return;
      const idle = t - ptr.last > 2500 || ptr.x < 0;
      // with the pointer: the hour under it; alone: the day goes by, from dawn to night and back
      const target = idle ? 7 + 8 * (1 - Math.cos((t / 1000) * 0.16)) : 7 + Math.min(1, Math.max(0, ptr.x)) * 16;
      hour += (target - hour) * Math.min(1, dt * (idle ? 1.2 : 5));
      paint();
    };

    const onMove = (e) => {
      const area = (canvas.closest(".hero-panel") ?? canvas).getBoundingClientRect();
      const inside = e.clientX >= area.left && e.clientX <= area.right && e.clientY >= area.top && e.clientY <= area.bottom;
      if (!inside) return;
      ptr.x = (e.clientX - area.left) / area.width;
      ptr.last = performance.now();
    };

    readColors();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);
    const mo = new MutationObserver(() =>
      requestAnimationFrame(() => {
        readColors();
        paint();
      }),
    );
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    let started = false;
    const start = () => {
      if (started || reduced) return;
      started = true;
      window.addEventListener("pointermove", onMove, { passive: true });
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const whenIdle = () => (window.requestIdleCallback ? window.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 300));
    if (document.readyState === "complete") whenIdle();
    else window.addEventListener("load", whenIdle, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("load", whenIdle);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden />;
}
