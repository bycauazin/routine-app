import { useMemo } from "react";
import { encode } from "uqr";

/**
 * QR code drawn as SVG from the module matrix (no HTML injection). Always
 * dark on white with a quiet zone, so phone cameras read it in dark mode too.
 * @param {{ value: string, size?: number, label: string }} props
 */
export function QrCode({ value, size = 184, label }) {
  const { path, cells } = useMemo(() => {
    const { data, size: n } = encode(value, { ecc: "M", border: 0 });
    let d = "";
    data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { path: d, cells: n };
  }, [value]);

  const quiet = 3;
  const total = cells + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`${-quiet} ${-quiet} ${total} ${total}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-[10px] bg-white"
    >
      <rect x={-quiet} y={-quiet} width={total} height={total} fill="#ffffff" />
      <path d={path} fill="#111111" />
    </svg>
  );
}
