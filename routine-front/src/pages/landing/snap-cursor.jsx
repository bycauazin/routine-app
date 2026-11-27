import { useEffect, useRef } from "react";
import "./snap-cursor.css";

/** What the ring snaps to. Text fields keep the normal text cursor. */
const TARGETS = 'a, button, [role="button"], label[for], summary, [data-cursor]';
const FIELDS = "input, textarea, select, [contenteditable]";
/** Bigger than this, the ring does not wrap the element (a whole card or section): it only grows. */
const MAX_SNAP = { w: 420, h: 140 };
const RING = 34;
const PAD = 6;

/**
 * "Encaixe" cursor of the public pages: a navy dot that follows the mouse
 * exactly and a pink ring that trails it. Over a link or button the ring takes
 * the shape of the element (same size and corners, plus a little margin) and
 * stays stuck to it, leaning slightly toward the mouse.
 *
 * Works over the whole page. What is under the mouse is checked on every
 * frame (not only when the mouse moves), so scrolling with the mouse still
 * keeps the ring on the right element. Only a real mouse drives it (touches
 * on hybrid screens are ignored), it hides when the mouse leaves the window,
 * and it is off with "reduce motion" or without a fine pointer (phones).
 * Everything moves with transforms in one requestAnimationFrame loop.
 */
export function SnapCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return undefined;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const html = document.documentElement;
    html.classList.add("snap-cursor");
    const p = { x: 0, y: 0, rx: 0, ry: 0, w: RING, h: RING, has: false, shown: false, away: false };
    let target = null;
    let radius = RING / 2;
    let pressed = false;
    let raf = 0;

    const show = (on) => {
      if (on === p.shown) return;
      p.shown = on;
      dot.dataset.shown = String(on);
      ring.dataset.shown = String(on);
    };

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      if (!p.has) {
        p.rx = e.clientX;
        p.ry = e.clientY;
        p.has = true;
      }
      if (p.away) {
        p.rx = e.clientX; // coming back: start from here, no jump from where it left
        p.ry = e.clientY;
        p.away = false;
      }
      p.x = e.clientX;
      p.y = e.clientY;
    };
    const onLeave = () => {
      p.away = true;
      show(false);
    };
    const onDown = (e) => {
      if (e.pointerType === "mouse") pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!p.has || p.away) return;
      // what is under the mouse right now (also after a scroll without moving it)
      const el = document.elementFromPoint(p.x, p.y);
      const inField = !!el?.closest(FIELDS);
      show(!!el && !inField);
      if (!p.shown) return;
      const next = inField ? null : (el?.closest(TARGETS) ?? null);
      if (next !== target) {
        target = next;
        radius = target ? parseFloat(getComputedStyle(target).borderRadius) || 10 : RING / 2;
      }

      let tx = p.x;
      let ty = p.y;
      let tw = RING;
      let th = RING;
      let tr = RING / 2;
      let snapped = false;
      if (target) {
        const r = target.getBoundingClientRect();
        if (r.width <= MAX_SNAP.w && r.height <= MAX_SNAP.h) {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          tx = cx + (p.x - cx) * 0.12;
          ty = cy + (p.y - cy) * 0.12;
          tw = r.width + PAD * 2;
          th = r.height + PAD * 2;
          tr = Math.min(radius + PAD, th / 2);
          snapped = true;
        } else {
          tw = th = 56;
          tr = 28;
        }
      }
      if (pressed) {
        tw *= 0.92;
        th *= 0.92;
      }
      const k = snapped ? 0.35 : 0.25;
      p.rx += (tx - p.rx) * k;
      p.ry += (ty - p.ry) * k;
      p.w += (tw - p.w) * 0.3;
      p.h += (th - p.h) * 0.3;
      ring.style.width = `${p.w}px`;
      ring.style.height = `${p.h}px`;
      ring.style.borderRadius = `${tr}px`;
      ring.style.transform = `translate3d(${p.rx - p.w / 2}px, ${p.ry - p.h / 2}px, 0)`;
      ring.dataset.snapped = String(snapped);
      dot.style.transform = `translate3d(${p.x - 4}px, ${p.y - 4}px, 0)`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    html.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove("snap-cursor");
      window.removeEventListener("pointermove", onMove);
      html.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <>
      <span ref={ringRef} className="snap-ring" aria-hidden />
      <span ref={dotRef} className="snap-dot" aria-hidden />
    </>
  );
}
