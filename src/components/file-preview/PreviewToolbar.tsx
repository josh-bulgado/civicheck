import type { ReactNode } from "react";
import { Maximize, Minus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { Separator } from "~/components/ui/separator";

/** Shared controls for image and PDF previews, above the document canvas. */
export function PreviewToolbar({
  zoom,
  onZoomOut,
  onZoomIn,
  onFit,
  canZoomOut,
  canZoomIn,
  fitLabel = "Fit to window",
  disabled = false,
  children,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  canZoomOut: boolean;
  canZoomIn: boolean;
  fitLabel?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <ButtonGroup
          aria-label="Preview zoom"
          variant="ghost"
          shape="soft"
          className="items-center overflow-hidden rounded-xl border border-border-light"
        >
          <Button
            type="button"
            size="icon-touch"
            aria-label="Zoom out"
            disabled={disabled || !canZoomOut}
            onClick={onZoomOut}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Separator orientation="vertical" className="h-5 data-vertical:self-center" />
          <span className="min-w-12 px-1 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Separator orientation="vertical" className="h-5 data-vertical:self-center" />
          <Button
            type="button"
            size="icon-touch"
            aria-label="Zoom in"
            disabled={disabled || !canZoomIn}
            onClick={onZoomIn}
          >
            <Plus aria-hidden="true" />
          </Button>
        </ButtonGroup>
        <Button
          type="button"
          variant="secondary"
          size="touch"
          shape="soft"
          className="bg-primary-soft text-primary hover:bg-primary-soft/80"
          disabled={disabled}
          onClick={onFit}
        >
          <Maximize data-icon="inline-start" aria-hidden="true" />
          {fitLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}
