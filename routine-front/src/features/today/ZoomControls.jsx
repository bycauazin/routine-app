import { Scan, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** − / + / Enquadrar for a week grid (see lib/use-grid-zoom.js). */
export function ZoomControls({ zoom, onFit }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Zoom da grade">
      <Button variant="ghost" size="icon" onClick={zoom.zoomOut} disabled={!zoom.canZoomOut} aria-label="Diminuir zoom" title="Diminuir zoom">
        <ZoomOut className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={zoom.zoomIn} disabled={!zoom.canZoomIn} aria-label="Aumentar zoom" title="Aumentar zoom">
        <ZoomIn className="size-4" />
      </Button>
      <Button variant="secondary" size="sm" onClick={onFit} title="Mostrar do primeiro ao último horário da rotina">
        <Scan className="size-4" aria-hidden /> Enquadrar
      </Button>
    </div>
  );
}
