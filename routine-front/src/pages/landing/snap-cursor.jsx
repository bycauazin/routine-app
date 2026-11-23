import { useEffect, useRef } from "react";

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
 * Only with a real mouse (pointer: fine) and without "reduce motion"; on
 * phones nothing changes. Everything is moved with transforms in one
 * requestAnimationFrame loop, no React renders.
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
    const p = { x: -100, y: -100, rx: -100, ry: -100, w: RING, h: RING, shown: false };
    let target = null;
    let radius = RING / 2;
    let pressed = false;
    let raf = 0;

    const setShown = (on) => {
      p.shown = on;
      dot.dataset.shown = String(on);
      ring.dataset.shown = String(on);
    };

    const onMove = (e) => {
      if (!p.shown) {
        p.rx = e.clientX;
        p.ry = e.clientY;
      }
      p.x = e.clientX;
      p.y = e.clientY;
      const el = e.target instanceof Element ? e.target : null;
      const inField = !!el?.closest(FIELDS);
      setShown(!inField);
      const next = inField ? null : el?.closest(TARGETS) ?? null;
      if (next !== target) {
        target = next;
        radius = target ? parseFloat(getComputedStyle(target).borderRadius) || 10 : RING / 2;
      }
    };
    const onLeave = (e) => {
      if (!e.relatedTarget) setShown(false);
    };
    const onDown = () => {
      pressed = true;
    };
    const onUp = () => {
      pressed = false;
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!p.shown) return;
      let tx = p.x;
      let ty = p.y;
      let tw = RING;
      let th = RING;
      let tr = RING / 2;
      let snapped = false;
      if (target?.isConnected) {
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
      const k = snapped ? 0.3 : 0.2;
      p.rx += (tx - p.rx) * k;
      p.ry += (ty - p.ry) * k;
      p.w += (tw - p.w) * 0.28;
      p.h += (th - p.h) * 0.28;
      ring.style.width = `${p.w}px`;
      ring.style.height = `${p.h}px`;
      ring.style.borderRadius = `${tr}px`;
      ring.style.transform = `translate3d(${p.rx - p.w / 2}px, ${p.ry - p.h / 2}px, 0)`;
      ring.dataset.snapped = String(snapped);
      dot.style.transform = `translate3d(${p.x - 4}px, ${p.y - 4}px, 0)`;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove("snap-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
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
