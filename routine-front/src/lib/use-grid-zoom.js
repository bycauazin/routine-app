import { useState } from "react";

/** Height of one hour on the week grids, in px: the zoom steps, the default and the limits for "Enquadrar". */
const STEPS = [20, 28, 36, 46, 56, 72, 92];
const DEFAULT = 56;
const MIN = 16;
const MAX = 120;
const KEY = "nucorre-grid-hour";

const clamp = (value) => Math.min(MAX, Math.max(MIN, value));
const saved = () => {
  try {
    const value = Number(localStorage.getItem(KEY));
    return value >= MIN && value <= MAX ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

/** What of the box shows hours: its height minus the sticky row of day names ([data-grid-head]). */
const view = (box) => box.clientHeight - (box.querySelector("[data-grid-head]")?.offsetHeight ?? 0);

/**
 * Zoom of the Semana and Simular grids (shared, remembered in this browser).
 * Zooming keeps the time at the middle of the box in place; fit(start, end)
 * makes those minutes fill the box and scrolls to them.
 */
export function useGridZoom(scrollRef) {
  const [hour, setHour] = useState(saved);

  function apply(next, anchorMinute) {
    const value = Math.round(clamp(next) * 10) / 10;
    const box = scrollRef.current;
    if (box) {
      const middle = ((box.scrollTop + view(box) / 2) / hour) * 60;
      requestAnimationFrame(() => {
        box.scrollTop = anchorMinute !== undefined ? (anchorMinute / 60) * value : (middle / 60) * value - view(box) / 2;
      });
    }
    setHour(value);
    try {
      localStorage.setItem(KEY, String(value));
    } catch {
      /* private mode: the zoom just is not remembered */
    }
  }

  return {
    hour,
    canZoomIn: hour < STEPS.at(-1),
    canZoomOut: hour > STEPS[0],
    zoomIn: () => apply(STEPS.find((s) => s > hour) ?? STEPS.at(-1)),
    zoomOut: () => apply(STEPS.findLast((s) => s < hour) ?? STEPS[0]),
    /** Fit [start, end) minutes in the box; without a range, back to the default zoom at 06:00. */
    fit(range) {
      const box = scrollRef.current;
      if (!range || !box) return apply(DEFAULT, 6 * 60);
      apply((view(box) / (range.end - range.start)) * 60, range.start);
    },
  };
}
