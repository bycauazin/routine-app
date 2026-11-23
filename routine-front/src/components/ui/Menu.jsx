import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const GAP = 6;
const MARGIN = 8;

/**
 * Dropdown menu. `trigger` receives { open, toggle, "aria-expanded", "aria-haspopup" }
 * and `items` are { label, icon?, onSelect, danger?, hidden? }.
 *
 * The list is positioned against the viewport (position: fixed), so it is
 * never clipped by a card with overflow-hidden nor painted under the next
 * row; it opens upwards when there is no room below. Closes on outside
 * click, Esc, scroll/resize and after choosing an item.
 */
export function Menu({ trigger, items, align = "right", className }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  // Measure after render, before paint: place below (or above) the trigger.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const anchor = rootRef.current?.getBoundingClientRect();
    const menu = menuRef.current?.getBoundingClientRect();
    if (!anchor || !menu) return;
    const below = anchor.bottom + GAP + menu.height <= window.innerHeight - MARGIN;
    const top = below ? anchor.bottom + GAP : Math.max(MARGIN, anchor.top - GAP - menu.height);
    let left = align === "right" ? anchor.right - menu.width : anchor.left;
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - menu.width - MARGIN);
    setPos({ top, left, up: !below });
  }, [open, align]);

  const visible = items.filter((i) => !i.hidden);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "menu" })}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: "hidden" }}
          className={cn(
            "fixed z-50 min-w-52 rounded-[10px] border border-rule bg-paper p-1 shadow-lg",
            pos && (pos.up ? "origin-bottom" : "origin-top"),
            pos && "animate-[fade-up_160ms_cubic-bezier(.2,.8,.2,1)]",
          )}
        >
          {visible.map((item, index) => (
            <button
              key={item.label}
              style={pos ? { animation: `fade-up 220ms ${index * 30}ms cubic-bezier(.2,.8,.2,1) backwards` } : undefined}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={cn(
                "group/item flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left text-[13.5px] whitespace-nowrap transition-colors hover:bg-sunk",
                item.danger && "text-danger",
              )}
            >
              {item.icon && <item.icon className="size-4 shrink-0 transition-transform duration-200 group-hover/item:scale-110" aria-hidden />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
