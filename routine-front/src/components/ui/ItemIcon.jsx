import { createElement } from "react";
import { cn } from "@/lib/cn";
import { iconFor } from "@/lib/icons";

/** Renders an icon by its stored name (Lucide, kebab-case). */
export function ItemIcon({ name, ...props }) {
  return createElement(iconFor(name), props);
}

const CHIP_SIZES = {
  sm: { box: "size-7 rounded-[8px]", icon: "size-[15px]" },
  md: { box: "size-9 rounded-[10px]", icon: "size-[17px]" },
  lg: { box: "size-11 rounded-[12px]", icon: "size-5" },
};

/** Icon on a soft tile of its own color (lists, cards). */
export function ItemChip({ name, color, size = "md", className }) {
  const s = CHIP_SIZES[size];
  return (
    <span className={cn("grid shrink-0 place-items-center", s.box, className)} style={{ backgroundColor: `${color}1c`, color }} aria-hidden>
      <ItemIcon name={name} className={s.icon} />
    </span>
  );
}
