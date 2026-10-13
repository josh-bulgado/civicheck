import { useEffect, useState } from "react";
import { ExternalLink, FileText, Maximize2 } from "lucide-react";
import { buttonVariants } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { PdfViewer } from "~/components/pdf/PdfViewer";
import { useCachedFileUrl } from "~/lib/use-cached-file-url";
import { cn } from "~/lib/utils";

/** Uploads are JPG, PNG or PDF, so anything that isn't a PDF is an image. */
function isPdfFileName(fileName: string) {
  return /\.pdf$/i.test(fileName);
}

interface DocumentPreviewProps {
  fileName: string;
  /** Short-lived link to the file; undefined while it is still being fetched. */
  url: string | undefined;
  /** Names the file for assistive tech and the dialog heading. */
  label: string;
  /** Called when the link fails to load, so the caller can re-sign it. */
  onUrlError?: () => void;
  className?: string;
}

/**
 * A thumbnail that lets an applicant see what they uploaded. Clicking it opens
 * the file in a dialog: images enlarged, PDFs in the in-page reader.
 *
 * The file is downloaded at most once per session: the thumbnail, the dialog
 * and the other wizard steps all read it from the in-memory file cache.
 */
export function DocumentPreview({
  fileName,
  url,
  label,
  onUrlError,
  className,
}: DocumentPreviewProps) {
  const [open, setOpen] = useState(false);
  // Remember which link failed rather than a bare boolean, so a re-signed link
  // gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // An image is only fetched once its thumbnail is near the screen, the way
  // `loading="lazy"` held it back, so a long list doesn't download everything.
  const [frameElement, setFrameElement] = useState<HTMLElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const isPdf = isPdfFileName(fileName);

  useEffect(() => {
    if (nearViewport || !frameElement) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNearViewport(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(frameElement);
    return () => observer.disconnect();
  }, [frameElement, nearViewport]);

  const image = useCachedFileUrl(url, !isPdf && nearViewport);
  const pdf = useCachedFileUrl(url, isPdf && open);

  // The cached copy when there is one. If the download itself failed (an
  // expired link, say) fall back to the signed link so the existing
  // `onError` → re-sign path still gets its chance.
  const imageSrc =
    isPdf || url === undefined || failedUrl === url
      ? undefined
      : (image.src ?? (image.status === "failed" ? url : undefined));
  const canShowImage = imageSrc !== undefined;
  const imageLoading =
    !isPdf && url !== undefined && failedUrl !== url && !canShowImage;

  function handleImageError() {
    if (url) setFailedUrl(url);
    onUrlError?.();
  }

  const frame = cn(
    "relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border-light bg-surface-subtle text-muted-foreground",
    className,
  );
  const thumbnail = (
    <>
      {canShowImage ? (
        <img
          src={imageSrc}
          alt=""
          onError={handleImageError}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex flex-col items-center leading-none">
          <FileText className="size-4.5" aria-hidden="true" />
          {isPdf ? (
            <span className="mt-0.5 text-[10px] font-bold">PDF</span>
          ) : null}
        </span>
      )}
      {url ? (
        <span
          aria-hidden="true"
          className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-sm bg-foreground/75 text-white"
        >
          <Maximize2 className="size-2.5" />
        </span>
      ) : null}
    </>
  );

  // Not loaded yet, or the link couldn't be made: nothing to open, but the row
  // keeps its footprint so the layout doesn't jump when the link arrives.
  if (!url) {
    return (
      <span ref={setFrameElement} aria-hidden="true" className={frame}>
        {thumbnail}
      </span>
    );
  }

  return (
    <>
      <button
        ref={setFrameElement}
        type="button"
        aria-label={`Preview ${label}`}
        onClick={() => setOpen(true)}
        className={cn(frame, "hover:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none")}
      >
        {thumbnail}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Portaled outside the wizard, so the inks are set here rather than
            inherited, the same as the camera dialog. */}
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-10 text-lg leading-snug font-bold text-foreground">
              {label}
            </DialogTitle>
            <DialogDescription className="text-[15px] leading-relaxed wrap-anywhere text-body-strong">
              {fileName}
            </DialogDescription>
          </DialogHeader>

          {isPdf ? (
            pdf.status === "ready" || pdf.status === "failed" ? (
              // A failed download falls through to the signed link, so the
              // viewer's own error state and re-sign callback still apply.
              <PdfViewer
                url={pdf.src ?? url}
                title={`Preview of ${label}`}
                onError={onUrlError}
                className="h-[65vh]"
              />
            ) : (
              <div
                role="status"
                className="flex h-[65vh] items-center justify-center gap-2 rounded-lg border border-border-light bg-surface-subtle text-sm text-muted-foreground"
              >
                <Spinner className="size-4" aria-hidden="true" />
                Loading PDF…
              </div>
            )
          ) : (
            <div className="flex max-h-[65vh] min-h-40 w-full items-center justify-center overflow-auto rounded-lg bg-surface-subtle">
              {canShowImage ? (
                <img
                  src={imageSrc}
                  alt={`Preview of ${label}`}
                  onError={handleImageError}
                  className="max-h-[65vh] w-full object-contain"
                />
              ) : imageLoading ? (
                <div
                  role="status"
                  className="flex items-center gap-2 p-6 text-sm text-muted-foreground"
                >
                  <Spinner className="size-4" aria-hidden="true" />
                  Loading image…
                </div>
              ) : (
                <p role="alert" className="p-6 text-center text-sm text-body-strong">
                  This preview couldn’t be loaded. The file is still uploaded —
                  you can close this and try again.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <ExternalLink data-icon="inline-start" aria-hidden="true" />
              Open in new tab
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
