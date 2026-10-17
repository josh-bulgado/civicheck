import { useEffect, useRef, useState } from "react";
import { Eye, FileText } from "lucide-react";
import { preloadPdfjs } from "~/components/pdf/PdfViewer";
import { getMyAttachmentSignedUrlFn } from "~/features/requests/applicant-requests.mutations";
import { getFileKind } from "~/features/requests/components/AttachmentViewerDialog";
import { loadFile } from "~/lib/file-preview-cache";
import { useCachedFileUrl } from "~/lib/use-cached-file-url";

/** Signed links last five minutes; past this age, ask for a new one. */
const LINK_FRESH_MS = 4 * 60 * 1000;

/**
 * What an applicant sees of an uploaded file on their request page: a small
 * picture of it that opens the preview. The eye badge is what says "you can
 * look at this"; there is no separate "View file" button to hunt for.
 *
 * Images show themselves. A PDF shows a document tile marked "PDF" (it opens in
 * the in-page reader). Until the link arrives, or if it can't be made, the tile
 * is the same document icon, and clicking still works: the parent signs a link
 * when it opens the preview.
 *
 * The preview is made quick before it is asked for: the file is downloaded once
 * into the in-memory file cache (the image itself, or a PDF's bytes), the PDF
 * reader library is loaded, and the link made here is handed to the preview so
 * it doesn't sign another. Opening is then just showing what is already here.
 * The cache is memory-only on purpose (see `file-preview-cache`): these are
 * identity documents and never written to disk.
 */
export function AttachmentThumbnail({
  attachmentId,
  version,
  label,
  busy,
  onOpen,
}: {
  attachmentId: string;
  /** Changes when the file behind this attachment may have been replaced. */
  version: string;
  /** Names the file for assistive tech. */
  label: string;
  /** The preview is being opened. */
  busy: boolean;
  /** `knownUrl` is a still-fresh link for this file, when the thumbnail has one. */
  onOpen: (knownUrl?: string) => void;
}) {
  const [url, setUrl] = useState<string>();
  const [imageFailed, setImageFailed] = useState(false);
  const signedAt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setUrl(undefined);
    setImageFailed(false);
    getMyAttachmentSignedUrlFn({ data: { attachmentId } }).then(
      (res) => {
        if (cancelled || res.error) return;
        signedAt.current = Date.now();
        setUrl(res.url);
      },
      () => {
        // Offline or the session lapsed: the tile keeps its icon.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attachmentId, version]);

  const kind = url ? getFileKind(url) : null;

  // A PDF has no picture to show here, but its bytes and the reader library can
  // be fetched now, so opening it doesn't start from nothing.
  useEffect(() => {
    if (kind !== "pdf" || !url) return;
    preloadPdfjs();
    loadFile(url).catch(() => {
      // The preview falls back to downloading it when opened.
    });
  }, [kind, url]);

  const image = useCachedFileUrl(url, kind === "image");
  // The cached copy when there is one; if the download itself failed, the
  // signed link, so a good link still gets its chance.
  const imageSrc =
    kind === "image" && !imageFailed
      ? (image.src ?? (image.status === "failed" ? url : undefined))
      : undefined;

  return (
    <button
      type="button"
      aria-label={`Preview ${label}`}
      title="Click to preview"
      disabled={busy}
      onClick={() =>
        onOpen(url && Date.now() - signedAt.current < LINK_FRESH_MS ? url : undefined)
      }
      className="relative flex h-18 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-primary-soft text-primary ring-1 ring-border-light transition-shadow outline-none hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-70"
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt=""
          onError={() => setImageFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span className="flex flex-col items-center leading-none">
          <FileText className="size-6" aria-hidden="true" />
          {kind === "pdf" ? (
            <span className="mt-1 text-[11px] font-bold">PDF</span>
          ) : null}
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-foreground/75 text-background"
      >
        <Eye className="size-3" />
      </span>
    </button>
  );
}
