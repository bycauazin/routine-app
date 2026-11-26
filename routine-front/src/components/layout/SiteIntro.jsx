import { useEffect, useState } from "react";
import { BrandMark, BrandSignature } from "./Brand";
import "./site-intro.css";

/**
 * Opening of the app, the same as the portfolio and Cacau (../landing-page/app/components/site-intro.js):
 * the logo spins in, "nuCorre" is typed, the <bycauazin/> signature appears and the curtain lifts.
 * Runs only when the inline script in index.html set data-intro="on" (every load of the landing
 * page, once per browser session elsewhere, never with prefers-reduced-motion; ?intro forces it).
 * A click or any key skips. Always navy, whatever the page theme.
 */
export const INTRO_KEY = "nucorre-intro";

// Each frame is the word at that moment; a new letter enters typed.
const WORD = "nuCorre";
const FRAMES = WORD.split("").map((_, i) => [760 + i * 95, WORD.slice(0, i + 1)]);
const TYPE_AT = 620; // the logo moves up and the typing line appears
const DONE_AT = 1500; // word complete: the signature comes in
const LIFT_AT = 2500; // the curtain starts to lift (waits for the page load if it has not finished)
const LIFT_MS = 900; // same as the transition of .intro[data-phase="lift"]

export function SiteIntro() {
  const [phase, setPhase] = useState("logo");
  const [frame, setFrame] = useState(-1);
  const [gone, setGone] = useState(() => document.documentElement.getAttribute("data-intro") !== "on");

  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-intro") !== "on") return undefined;

    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    let lifted = false;

    const lift = () => {
      if (lifted) return;
      lifted = true;
      timers.forEach(clearTimeout);
      setFrame(FRAMES.length - 1);
      setPhase("lift");
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* private mode: the intro may play again, that's all */
      }
      root.setAttribute("data-intro", "reveal");
      setTimeout(() => {
        root.removeAttribute("data-intro");
        setGone(true);
      }, LIFT_MS + 60);
    };

    at(TYPE_AT, () => setPhase("type"));
    FRAMES.forEach(([ms], index) => at(ms, () => setFrame(index)));
    at(DONE_AT, () => setPhase("done"));
    at(LIFT_AT, () => {
      if (document.readyState === "complete") lift();
      else window.addEventListener("load", lift, { once: true });
    });

    const skip = (event) => {
      if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      lift();
    };
    window.addEventListener("pointerdown", skip);
    window.addEventListener("keydown", skip);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", lift);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  if (gone) return null;

  const text = frame >= 0 ? FRAMES[frame][1] : "";

  return (
    <div className="intro" data-phase={phase} aria-hidden="true">
      <span className="intro-corner">~/nucorre</span>
      <div className="intro-stack">
        <div className="intro-mark-wrap">
          <BrandMark onBrand className="intro-mark h-[132px]" />
        </div>
        <p className="intro-word">
          {text.split("").map((ch, i) => (
            <span key={i} className="intro-enter">
              {ch}
            </span>
          ))}
          <span className="intro-caret" />
        </p>
        <p className="intro-tagline">
          <BrandSignature className="[&_i:nth-child(2)]:text-[#f4a6c1]" />
        </p>
      </div>
      <span className="intro-hint">clique para pular</span>
      <span className="intro-progress" />
    </div>
  );
}
