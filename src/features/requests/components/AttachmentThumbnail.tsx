import { useEffect, useRef, useState } from "react";
import { Eye, File, FileText, Image as ImageIcon } from "lucide-react";
import { preloadPdfjs } from "~/components/pdf/PdfViewer";
import { getMyAttachmentSignedUrlFn } from "~/features/requests/applicant-requests.mutations";
import { getFileKind } from "~/features/requests/components/AttachmentPreview";
import { loadFile } from "~/lib/file-preview-cache";
import { useCachedFileUrl } from "~/lib/use-cached-file-url";

/** Signed links last five minutes; past this age, ask for a new one. */
const LINK_FRESH_MS = 4 * 60 * 1000;

/**
 * An uploaded image is shown as a thumbnail; PDFs keep their labeled file tile.
 * The eye cue opens the full document viewer. Links and cached file bytes are
 * shared with that viewer, so previews do not need to start a second download.
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

  const Icon = kind === "image" ? ImageIcon : kind === "pdf" ? FileText : File;
  const extension = url?.split("?")[0].match(/\.(png|jpe?g|gif|webp|svg)$/i)?.[1].toUpperCase();
  const fileType = kind === "pdf" ? "PDF" : kind === "image" ? extension === "JPEG" ? "JPG" : extension ?? "IMG" : "FILE";
  const image = useCachedFileUrl(url, kind === "image");
  const imageSrc = kind === "image" && !imageFailed
    ? (image.src ?? (image.status === "failed" ? url : undefined)) : undefined;

  return (
    <button
      type="button"
      aria-label={`Preview ${label}`}
      title="Open document preview"
      disabled={busy}
      onClick={() =>
        onOpen(url && Date.now() - signedAt.current < LINK_FRESH_MS ? url : undefined)
      }
      className="relative flex size-12 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-xl bg-primary-soft text-primary ring-1 ring-border-light transition-shadow outline-none hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-70"
    >
      {imageSrc ? (
        <img src={imageSrc} alt="" onError={() => setImageFailed(true)} className="size-full object-cover" />
      ) : (
        <>
          <Icon className="size-5" aria-hidden="true" />
          <span className="text-[9px] leading-none font-semibold" aria-hidden="true">{fileType}</span>
        </>
      )}
      <span aria-hidden="true" className="absolute right-0.5 bottom-0.5 flex size-4 items-center justify-center rounded-full bg-foreground/75 text-background">
        <Eye className="size-2.5" />
      </span>
    </button>
  );
}
