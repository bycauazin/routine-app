import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

const CW = 52; // cell width, like a spreadsheet column
const CH = 26; // cell height, one hour row
const RADIUS = { phone: 110, wide: 150 };
const CATS = ["--cat-work", "--cat-commute", "--cat-study", "--cat-meal", "--cat-workout", "--cat-class", "--cat-personal"];

/** The week as it lived in the spreadsheet: weekday columns, hour rows → category index. */
const DAY_ROWS = [6, 1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 2, 2, 1, 4, 4, 5, 6];
function catFor(c, r) {
  const day = c % 8;
  const hour = r % DAY_ROWS.length;
  if (day >= 5) return day === 5 && (hour === 3 || hour === 4) ? 5 : 6;
  if (hour === 11 && (day === 1 || day === 3)) return 5;
  if (hour === 12 && (day === 1 || day === 3)) return 4;
  return DAY_ROWS[hour];
}

/**
 * "Planilha viva": the faint grid of the weekly spreadsheet; the cells the
 * pointer passes over fill with the category colors and fade out. With no
 * pointer for a while, a ghost pointer wanders.
 *
 * Calm zones: nothing ever paints behind elements marked [data-calm]
 * (titles, text, buttons, the fixed header over the hero), so reading is
 * never disturbed.
 *
 * Performance (lessons from the Finance hero): the grid lines are drawn once
 * into an offscreen canvas, only cells near the pointer are tested, the loop
 * starts after the page has loaded and the browser is idle, and it pauses
 * off-screen and in a hidden tab. Reduced motion: just the still grid.
 */
export function LiveSheet({ className }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lines = document.createElement("canvas");

    let w = 0;
    let h = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0);
    let calm = new Uint8Array(0);
    let colors = { rule: "", accent: "", cats: [] };
    const ptr = { x: -999, y: -999, tx: -999, ty: -999, last: -1e9, inside: false };
    let visible = true;
    let started = false;
    let raf = 0;
    let prev = performance.now();

    const drawLines = () => {
      lines.width = canvas.width;
      lines.height = canvas.height;
      const l = lines.getContext("2d");
      l.setTransform(dpr, 0, 0, dpr, 0, 0);
      l.strokeStyle = colors.rule;
      l.lineWidth = 1;
      l.beginPath();
      for (let c = 0; c <= cols; c++) {
        l.moveTo(c * CW + 0.5, 0);
        l.lineTo(c * CW + 0.5, h);
      }
      for (let r = 0; r <= rows; r++) {
        l.moveTo(0, r * CH + 0.5);
        l.lineTo(w, r * CH + 0.5);
      }
      l.stroke();
    };

    const readColors = () => {
      const s = getComputedStyle(document.documentElement);
      colors = { rule: s.getPropertyValue("--rule").trim(), accent: s.getPropertyValue("--accent-text").trim(), cats: CATS.map((n) => s.getPropertyValue(n).trim()) };
      drawLines();
      paint(0);
    };

    const measureCalm = () => {
      const box = canvas.getBoundingClientRect();
      const pad = 12;
      const zones = [...document.querySelectorAll("[data-calm]")].map((el) => {
        const r = el.getBoundingClientRect();
        return [r.left - box.left - pad, r.top - box.top - pad, r.right - box.left + pad, r.bottom - box.top + pad];
      });
      calm = new Uint8Array(cols * rows);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x0 = c * CW;
          const y0 = r * CH;
          if (zones.some(([a, b, cc, d]) => x0 + CW > a && x0 < cc && y0 + CH > b && y0 < d)) calm[r * cols + c] = 1;
        }
      }
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CW) + 1;
      rows = Math.ceil(h / CH) + 1;
      heat = new Float32Array(cols * rows);
      measureCalm();
      readColors();
    };

    function paint(dt) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(lines, 0, 0, w, h);
      if (!dt) return;
      const R = w < 640 ? RADIUS.phone : RADIUS.wide;
      const c0 = Math.max(0, Math.floor((ptr.x - R) / CW));
      const c1 = Math.min(cols - 1, Math.ceil((ptr.x + R) / CW));
      const r0 = Math.max(0, Math.floor((ptr.y - R) / CH));
      const r1 = Math.min(rows - 1, Math.ceil((ptr.y + R) / CH));
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const i = r * cols + c;
          if (calm[i]) continue;
          const v = 1 - Math.hypot(c * CW + CW / 2 - ptr.x, r * CH + CH / 2 - ptr.y) / R;
          if (v > heat[i]) heat[i] = v;
        }
      }
      const decay = dt * 0.75;
      for (let i = 0; i < heat.length; i++) {
        const v = heat[i];
        if (v <= 0.01) {
          heat[i] = 0;
          continue;
        }
        heat[i] = Math.max(0, v - decay * (0.35 + v * 0.4));
        const c = i % cols;
        const r = (i - c) / cols;
        ctx.globalAlpha = Math.min(1, v * 1.6);
        ctx.fillStyle = colors.cats[catFor(c, r)];
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(c * CW + 2, r * CH + 2, CW - 3, CH - 3, 5);
        else ctx.rect(c * CW + 2, r * CH + 2, CW - 3, CH - 3);
        ctx.fill();
        if (v > 0.7) {
          ctx.globalAlpha = (v - 0.7) * 3;
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    const frame = (t) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      if (!visible || document.hidden) return;
      const idle = !ptr.inside || t - ptr.last > 2500;
      if (idle) {
        const s = t / 1000;
        ptr.tx = w * (0.62 + 0.28 * Math.sin(s * 0.37));
        ptr.ty = h * (0.5 + 0.34 * Math.sin(s * 0.53 + 1.3));
      }
      const ease = idle ? 0.04 : 0.35;
      ptr.x = ptr.x < -900 ? ptr.tx : ptr.x + (ptr.tx - ptr.x) * ease;
      ptr.y = ptr.y < -900 ? ptr.ty : ptr.y + (ptr.ty - ptr.y) * ease;
      paint(dt);
    };

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      ptr.inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (!ptr.inside) return;
      ptr.tx = x;
      ptr.ty = y;
      ptr.last = performance.now();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => requestAnimationFrame(readColors));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    // Text moves while it rises in and when fonts arrive: measure the calm zones again then.
    const remeasure = window.setTimeout(measureCalm, 1200);
    document.fonts?.ready.then(measureCalm);

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
      window.clearTimeout(remeasure);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("load", whenIdle);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={cn("pointer-events-none absolute inset-0 h-full w-full", className)} aria-hidden />;
}
