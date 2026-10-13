import { ExternalLink } from "lucide-react";
import { PdfViewer } from "~/components/pdf/PdfViewer";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { useCachedFileUrl } from "~/lib/use-cached-file-url";

export function getFileKind(url: string): "image" | "pdf" | "other" {
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(clean)) return "image";
  if (/\.pdf$/.test(clean)) return "pdf";
  return "other";
}

/**
 * Previews a signed attachment URL. Open while `url` is set; the caller owns
 * fetching the URL and clears it via `onClose`.
 */
export function AttachmentViewerDialog({
  url,
  subjectRole,
  requirementName,
  onClose,
}: {
  url: string | null;
  subjectRole: string | null;
  requirementName: string;
  onClose: () => void;
}) {
  const fileKind = url ? getFileKind(url) : null;
  // Each open signs a fresh link, but the file behind it is the same one, so
  // the bytes come from the in-memory cache after the first view. A failed
  // download falls back to the signed link itself.
  const file = useCachedFileUrl(
    url ?? undefined,
    fileKind === "image" || fileKind === "pdf",
  );
  const fileReady = file.status === "ready" || file.status === "failed";
  const fileSrc = file.src ?? url ?? undefined;

  return (
    <Dialog open={url != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {subjectRole ? `${subjectRole}: ` : ""}
            {requirementName}
          </DialogTitle>
        </DialogHeader>
        {url && (
          <div className="flex h-[75vh] items-center justify-center overflow-hidden">
            {fileKind === "image" || fileKind === "pdf" ? (
              fileReady && fileSrc ? (
                fileKind === "image" ? (
                  <img
                    src={fileSrc}
                    alt={requirementName}
                    className="h-full w-full rounded-md object-contain"
                  />
                ) : (
                  <PdfViewer
                    url={fileSrc}
                    title={requirementName}
                    className="h-full w-full"
                  />
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
                  render={<a href={url} target="_blank" rel="noopener noreferrer" />}
                >
                  <ExternalLink className="size-4" />
                  Open in a new tab
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
