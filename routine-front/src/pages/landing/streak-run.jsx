import { Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Squares of the streak line: one per day, as many as fit across the whole page (the badge takes ~170px). */
const daysFor = (width) => Math.max(7, Math.floor((width - 32 - 170) / 33));
/** Time between two squares: the whole line fills in about 1.7s, whatever its length. */
const stepFor = (days) => Math.min(110, Math.round(1700 / days));

/**
 * "Sequência", between two sections: when the line reaches the upper part of
 * the screen, day squares fill in across the whole page, from one side to the
 * other, like a habit streak, and
 * end with the "N dias seguidos" badge, then fade. Plays again each time you
 * come back to it; off with reduced motion. Decorative (aria-hidden).
 */
export function StreakRun() {
  const ref = useRef(null);
  const [run, setRun] = useState(0);
  const [days, setDays] = useState(10);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let last = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || Date.now() - last < 4000) return;
        last = Date.now();
        setDays(daysFor(el.clientWidth));
        setRun((n) => n + 1);
      },
      { rootMargin: "0px 0px -40% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="streak-run" aria-hidden>
      {run > 0 && (
        <div key={run} className="streak-row" style={{ "--n": days, "--step": `${stepFor(days)}ms` }}>
          {Array.from({ length: days }, (_, i) => (
            <span key={i} className="streak-day" style={{ "--i": i }} />
          ))}
          <span className="streak-badge" style={{ "--i": days }}>
            <Flame className="size-3.5" aria-hidden /> {days} dias seguidos
          </span>
        </div>
      )}
    </div>
  );
}
