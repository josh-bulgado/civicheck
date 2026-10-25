import { QuietAnchor } from "~/components/quiet-link";
import { ExternalLink } from "lucide-react";
import { PdfViewer } from "~/components/pdf/PdfViewer";
import { Button } from "~/components/ui/button";
import { DocumentSkeleton } from "~/components/feedback/PageSkeleton";
import { ImageMagnifier } from "~/features/requests/components/ImageMagnifier";
import { useCachedFileUrl } from "~/lib/use-cached-file-url";
import { cn } from "~/lib/utils";

export function getFileKind(url: string): "image" | "pdf" | "other" {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(clean)) return "image";
  if (/\.pdf$/.test(clean)) return "pdf";
  return "other";
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
  const file = useCachedFileUrl(
    url,
    fileKind === "image" || fileKind === "pdf",
  );
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
            <ImageMagnifier key={fileSrc} src={fileSrc} alt={name} />
          ) : (
            <PdfViewer url={fileSrc} title={name} className="h-full w-full" />
          )
        ) : (
          <DocumentSkeleton
            label={`Loading ${fileKind === "pdf" ? "PDF" : "image"}`}
          />
        )
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
          <p>This file type can't be previewed here.</p>
          <Button
            size="sm"
            variant="outline"
            nativeButton={false}
            render={
              <QuietAnchor
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink className="size-4" />
            Open in a new tab
          </Button>
        </div>
      )}
    </div>
  );
}
