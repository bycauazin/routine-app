import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useController } from "react-hook-form";
import { cn } from "@/lib/cn";
import { ICONS, ICON_GROUPS, SWATCHES, colorForIcon } from "@/lib/icons";
import { ItemChip } from "./ItemIcon";

/** Radio group of color swatches. */
export function ColorPicker({ value, onChange, label = "Cor" }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {SWATCHES.map((color) => {
        const selected = value?.toLowerCase() === color;
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              "grid size-8 place-items-center rounded-full ring-offset-2 ring-offset-paper transition-transform duration-150 hover:scale-110",
              selected && "ring-2 ring-ink",
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-3.5 text-white" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}

/** A row of icons (radio group), tinted with the chosen color. */
function IconRow({ options, value, onChange, color }) {
  return (
    <div role="radiogroup" aria-label="Ícone" className="flex flex-wrap gap-1.5">
      {options.map((name) => {
        const Icon = ICONS[name];
        if (!Icon) return null;
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name}
            title={name}
            onClick={() => onChange(name)}
            className={cn(
              "grid size-10 place-items-center rounded-[10px] border transition-colors duration-150",
              selected ? "border-transparent" : "border-rule text-muted hover:border-rule-strong hover:text-ink",
            )}
            style={selected ? { backgroundColor: `${color}26`, color, borderColor: color } : undefined}
          >
            <Icon className="size-[18px] animate-[fade-up_240ms_cubic-bezier(.2,.8,.2,1)_backwards]" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Icon + color of an item, collapsed by default: most of the time the icon
 * suggested from the name is fine, so the form only shows a preview row.
 * Tapping "Trocar" expands it in place: colors, then icons by theme (a few
 * at a time, no wall of icons). Works with react-hook-form fields "icon"
 * and "color".
 * @param {{ control: object, options?: string[], suggested?: boolean, className?: string }} props  options: a short custom icon list (no themes); suggested: the icon follows the name typed
 */
export function AppearanceField({ control, options, suggested = false, className }) {
  const icon = useController({ control, name: "icon" }).field;
  const color = useController({ control, name: "color" }).field;
  const [open, setOpen] = useState(false);
  const groupOf = (name) => ICON_GROUPS.find((g) => g.icons.includes(name))?.key ?? ICON_GROUPS[0].key;
  const [group, setGroup] = useState(() => groupOf(icon.value));
  // Once a color is picked by hand, icons stop changing it.
  const [colorChosen, setColorChosen] = useState(false);
  const pickIcon = (name) => {
    icon.onChange(name);
    if (!colorChosen) color.onChange(colorForIcon(name));
  };
  const pickColor = (value) => {
    setColorChosen(true);
    color.onChange(value);
  };

  const toggle = () => {
    if (!open) setGroup(groupOf(icon.value));
    setOpen((v) => !v);
  };
  const shownIcons = options ?? ICON_GROUPS.find((g) => g.key === group)?.icons ?? [];

  return (
    <div className={cn("overflow-hidden rounded-[12px] border border-rule sm:col-span-2", className)}>
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sunk">
        <ItemChip name={icon.value} color={color.value} size="md" className="transition-colors duration-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-[560]">Ícone e cor</span>
          <span className="block text-[12.5px] text-muted">{open ? "Escolha abaixo" : suggested ? "Sugerido pelo nome. Toque para trocar." : "Toque para trocar."}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-[560] text-accent-text">
          {open ? "Pronto" : "Trocar"}
          <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} aria-hidden />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-rule px-3 py-3 animate-[open-down_240ms_cubic-bezier(.2,.8,.2,1)]">
          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-[560] text-muted">
              Cor <span className="font-[450]">· segue o tema do ícone, se você não escolher</span>
            </span>
            <ColorPicker value={color.value} onChange={pickColor} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[12.5px] font-[560] text-muted">Ícone</span>
            {!options && (
              <div role="tablist" aria-label="Temas de ícones" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]">
                {ICON_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    role="tab"
                    aria-selected={group === g.key}
                    onClick={() => setGroup(g.key)}
                    className={cn(
                      "h-8 shrink-0 rounded-full border px-3 text-[12.5px] transition-colors",
                      group === g.key ? "border-accent bg-accent-soft font-[600] text-accent-text" : "border-rule text-muted hover:text-ink",
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            <IconRow key={options ? "custom" : group} options={shownIcons} value={icon.value} onChange={pickIcon} color={color.value} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Colored icon chip used in lists. */
export function IconBadge({ icon: Icon, color, size = "md" }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-xs", size === "sm" ? "size-7" : "size-9")}
      style={{ backgroundColor: `${color}1f`, color }}
      aria-hidden
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </span>
  );
}

/**
 * Icon of a routine item, collapsed by default. `value` null = automatic: the
 * icon suggested by the name (else the category's). "Trocar" opens the icons
 * by theme; "Automático" goes back to following the name.
 * @param {{ value: string | null, onChange: (icon: string | null) => void, auto: string, tint?: string, color?: string }} props  auto: the icon shown when automatic; tint: category class for the tile, else `color`
 */
export function IconField({ value, onChange, auto, tint, color }) {
  const [open, setOpen] = useState(false);
  const shown = value ?? auto;
  const groupOf = (name) => ICON_GROUPS.find((g) => g.icons.includes(name))?.key ?? ICON_GROUPS[0].key;
  const [group, setGroup] = useState(() => groupOf(shown));
  const tileColor = color ?? colorForIcon(shown);
  const toggle = () => {
    if (!open) setGroup(groupOf(shown));
    setOpen((v) => !v);
  };

  return (
    <div className="overflow-hidden rounded-[12px] border border-rule">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-sunk">
        {tint ? (
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-[12px] text-ink", tint)} aria-hidden>
            <ItemIconOnly name={shown} />
          </span>
        ) : (
          <ItemChip name={shown} color={tileColor} size="lg" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-[560]">Ícone</span>
          <span className="block text-[12.5px] text-muted">{open ? "Escolha abaixo" : value ? "Escolhido por você. Toque para trocar." : "Sugerido pelo nome. Toque para trocar."}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[13px] font-[560] text-accent-text">
          {open ? "Pronto" : "Trocar"}
          <ChevronDown className={cn("size-4 transition-transform duration-300", open && "rotate-180")} aria-hidden />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-rule px-3 py-3 animate-[open-down_240ms_cubic-bezier(.2,.8,.2,1)]">
          <div role="tablist" aria-label="Temas de ícones" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none]">
            {ICON_GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={group === g.key}
                onClick={() => setGroup(g.key)}
                className={cn("h-8 shrink-0 rounded-full border px-3 text-[12.5px] transition-colors", group === g.key ? "border-accent bg-accent-soft font-[600] text-accent-text" : "border-rule text-muted hover:text-ink")}
              >
                {g.label}
              </button>
            ))}
          </div>
          <IconRow key={group} options={ICON_GROUPS.find((g) => g.key === group)?.icons ?? []} value={shown} onChange={onChange} color={tileColor} />
          {value && (
            <button type="button" onClick={() => onChange(null)} className="self-start text-[13px] font-[560] text-accent-text hover:underline">
              Voltar ao automático (pelo nome)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ItemIconOnly({ name }) {
  const Icon = ICONS[name] ?? ICONS.tag;
  return <Icon className="size-5" />;
}
