import { useState } from "react";
import { ExternalLink, Minus, Plus } from "lucide-react";
import { PdfViewer } from "~/components/pdf/PdfViewer";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { useCachedFileUrl } from "~/lib/use-cached-file-url";
import { cn } from "~/lib/utils";

export function getFileKind(url: string): "image" | "pdf" | "other" {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(clean)) return "image";
  if (/\.pdf$/.test(clean)) return "pdf";
  return "other";
}

const IMAGE_ZOOMS = [1, 1.5, 2, 3];

/**
 * An image that fits its box until zoomed. Zooming grows it inside a scrolling
 * frame, so the details of an ID or a stamp can be checked up close.
 */
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [step, setStep] = useState(0);
  const zoom = IMAGE_ZOOMS[step];

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full overflow-auto rounded-md">
        <img
          src={src}
          alt={alt}
          style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }}
          className={cn(
            "max-w-none",
            zoom === 1 ? "h-full w-full object-contain" : "h-auto",
          )}
        />
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-lg bg-background/90 p-0.5 shadow-sm ring-1 ring-border">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom out"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="min-w-10 text-center text-xs tabular-nums text-muted-foreground">
          {zoom === 1 ? "Fit" : `${zoom * 100}%`}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom in"
          disabled={step === IMAGE_ZOOMS.length - 1}
          onClick={() =>
            setStep((current) => Math.min(IMAGE_ZOOMS.length - 1, current + 1))
          }
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Shows the file behind a signed attachment URL: an image, a PDF, or a link out
 * for anything else. Give it a height through `className`; it fills that box.
 */
export function AttachmentPreview({
  url,
  name,
  className,
}: {
  url: string;
  name: string;
  className?: string;
}) {
  const fileKind = getFileKind(url);
  // Each open signs a fresh link, but the file behind it is the same one, so
  // the bytes come from the in-memory cache after the first view. A failed
  // download falls back to the signed link itself.
  const file = useCachedFileUrl(url, fileKind === "image" || fileKind === "pdf");
  const fileReady = file.status === "ready" || file.status === "failed";
  const fileSrc = file.src ?? url;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className,
      )}
    >
      {fileKind === "image" || fileKind === "pdf" ? (
        fileReady ? (
          fileKind === "image" ? (
            <ZoomableImage key={fileSrc} src={fileSrc} alt={name} />
          ) : (
            <PdfViewer url={fileSrc} title={name} className="h-full w-full" />
          )
        ) : (
          <div
            role="status"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Spinner className="size-4" aria-hidden="true" />
            Loading {fileKind === "pdf" ? "PDF" : "image"}…
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
          <p>This file type can't be previewed here.</p>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={<a href={url} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLink className="size-4" />
            Open in a new tab
          </Button>
        </div>
      )}
    </div>
  );
}
