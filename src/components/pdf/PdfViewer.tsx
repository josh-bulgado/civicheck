import { QuietAnchor } from "~/components/quiet-link";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Minus, Plus } from "lucide-react";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import { Button } from "~/components/ui/button";
import { DocumentSkeleton } from "~/components/feedback/PageSkeleton";

/**
 * Loads pdf.js on first use, in the browser only. pdf.js touches DOM globals
 * when it is imported, so it must never be pulled in during server rendering;
 * this file only ever imports its types at the top level.
 *
 * The legacy build is used on purpose: the standard one calls `Promise.try`
 * and other very recent APIs that older phone browsers lack, while the legacy
 * build ships fallbacks for them.
 */
let pdfjsPromise: Promise<
  typeof import("pdfjs-dist/legacy/build/pdf.mjs")
> | null = null;
function loadPdfjs() {
  pdfjsPromise ??= (async () => {
    const [pdfjs, worker] = await Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  })();
  // A failed load (offline, chunk missing) shouldn't poison later attempts.
  pdfjsPromise.catch(() => {
    pdfjsPromise = null;
  });
  return pdfjsPromise;
}

/**
 * Starts loading pdf.js and its worker ahead of time, so the first PDF a reader
 * opens isn't also waiting for the library. Safe to call any number of times;
 * does nothing on the server.
 */
export function preloadPdfjs() {
  if (typeof window === "undefined") return;
  loadPdfjs().catch(() => {
    // A failed preload is retried when a viewer actually needs the library.
  });
}

// Self-hosted decoders and fallback fonts, copied from node_modules/pdfjs-dist
// into public/pdfjs. Without them, scans stored as JPEG 2000 or JBIG2 render
// blank and PDFs that don't embed their fonts fall back to guesses. Refresh the
// copies when pdfjs-dist is upgraded.
const WASM_URL = "/pdfjs/wasm/";
const STANDARD_FONT_URL = "/pdfjs/standard_fonts/";

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2, 3];
const PAGE_GUTTER_PX = 12;
/** Retina canvases past 2x cost memory without a visible gain on a document. */
const MAX_PIXEL_RATIO = 2;

/** Every PDF has `%PDF-` within its first kilobyte. */
function looksLikePdf(bytes: Uint8Array) {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  return head.includes("%PDF-");
}

type ViewerState =
  | { phase: "loading" }
  | { phase: "ready"; doc: PDFDocumentProxy; aspect: number }
  | { phase: "error" };

interface PdfViewerProps {
  /** Signed or public URL of the PDF. */
  url: string;
  /** Accessible name for the scrollable page area. */
  title: string;
  /** Called once if the file can't be loaded, so the caller can re-sign `url`. */
  onError?: () => void;
  className?: string;
}

/**
 * An in-page PDF reader: every page, scrollable, with zoom. Pages are drawn to
 * canvases only while they are near the viewport, so a long scan doesn't hold
 * every page's pixels in memory at once.
 *
 * Rendered with pdf.js rather than an `<iframe>`: phone browsers show only the
 * first page of a framed PDF, or none of it, and phones are where most
 * applicants will be.
 */
export function PdfViewer({ url, title, onError, className }: PdfViewerProps) {
  const [state, setState] = useState<ViewerState>({ phase: "loading" });
  const [zoomIndex, setZoomIndex] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    const abort = new AbortController();
    setState({ phase: "loading" });

    void (async () => {
      try {
        const pdfjs = await loadPdfjs();
        if (cancelled) return;
        // Fetch the bytes here rather than handing pdf.js the URL. It keeps the
        // file to one plain request (no byte-range negotiation with the
        // storage CDN) and lets a failure say what it was: an HTTP error, a
        // blocked request, or a response that isn't a PDF at all.
        const response = await fetch(url, { signal: abort.signal });
        if (!response.ok) {
          throw new Error(`The file request failed (HTTP ${response.status}).`);
        }
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!looksLikePdf(bytes)) {
          throw new Error(
            `The response is not a PDF (${response.headers.get("content-type") ?? "unknown type"}, ${bytes.length} bytes).`,
          );
        }
        if (cancelled) return;
        task = pdfjs.getDocument({
          data: bytes,
          wasmUrl: WASM_URL,
          standardFontDataUrl: STANDARD_FONT_URL,
        });
        const doc = await task.promise;
        const first = await doc.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setState({
          phase: "ready",
          doc,
          aspect: viewport.height / viewport.width,
        });
      } catch {
        if (cancelled) return;
        setState({ phase: "error" });
        onErrorRef.current?.();
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
      // Destroying the task also tears down the document and its worker port.
      void task?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => setContainerWidth(scroller.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [state.phase]);

  const zoom = ZOOM_STEPS[zoomIndex];
  const pageWidth = Math.max(0, containerWidth - PAGE_GUTTER_PX * 2) * zoom;

  if (state.phase === "error") {
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-3 rounded-lg bg-surface-subtle p-6 text-center ${className ?? ""}`}
      >
        <p className="max-w-sm text-sm text-body-strong">
          This PDF couldn’t be shown here. The file is still uploaded.
        </p>
        <Button
          type="button"
          variant="outline"
          nativeButton={false}
          render={
            <QuietAnchor href={url} target="_blank" rel="noopener noreferrer" />
          }
        >
          <ExternalLink data-icon="inline-start" aria-hidden="true" />
          Open in a new tab
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-border-light bg-surface-subtle ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-light bg-card px-3 py-1.5">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {state.phase === "ready"
            ? `${state.doc.numPages} ${state.doc.numPages === 1 ? "page" : "pages"}`
            : "Loading PDF…"}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
          >
            <Minus aria-hidden="true" />
          </Button>
          <span
            className="w-11 text-center text-sm font-semibold text-foreground tabular-nums"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            disabled={zoomIndex === ZOOM_STEPS.length - 1}
            onClick={() =>
              setZoomIndex((index) =>
                Math.min(ZOOM_STEPS.length - 1, index + 1),
              )
            }
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label={title}
        className="min-h-0 flex-1 overflow-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        style={{ padding: PAGE_GUTTER_PX }}
      >
        {state.phase === "loading" ? (
          <DocumentSkeleton label="Loading PDF" />
        ) : (
          <div className="flex w-max min-w-full flex-col items-center gap-3">
            {Array.from({ length: state.doc.numPages }, (_, index) => (
              <PdfPage
                key={index + 1}
                doc={state.doc}
                pageNumber={index + 1}
                width={pageWidth}
                aspect={state.aspect}
                label={`Page ${index + 1} of ${state.doc.numPages}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface PdfPageProps {
  doc: PDFDocumentProxy;
  pageNumber: number;
  /** CSS pixel width the page is drawn at. */
  width: number;
  /** Height over width of the first page, until this page is measured. */
  aspect: number;
  label: string;
}

function PdfPage({ doc, pageNumber, width, aspect, label }: PdfPageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nearViewport, setNearViewport] = useState(pageNumber === 1);
  // The page's own proportions, once known; pages in one file can differ.
  const [measuredAspect, setMeasuredAspect] = useState<number | null>(null);
  const [status, setStatus] = useState<"rendering" | "done" | "failed">(
    "rendering",
  );
  // The first page is always drawn: it's what the reader opened the file to
  // see, and it shouldn't depend on the visibility observer having fired.
  const shouldRender = nearViewport || pageNumber === 1;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNearViewport(entry.isIntersecting),
      { rootMargin: "600px 0px" },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!shouldRender || width <= 0) {
      // Off screen: give the pixels back. The wrapper keeps the page's size.
      canvas.width = 0;
      canvas.height = 0;
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | null = null;
    setStatus("rendering");
    void (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          MAX_PIXEL_RATIO,
        );
        const viewport = page.getViewport({
          scale: (width / base.width) * pixelRatio,
        });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        if (cancelled) return;
        setMeasuredAspect(base.height / base.width);
        setStatus("done");
      } catch (error) {
        // A render cancelled by a zoom or a scroll lands here too; that is
        // expected and the next render takes over.
        if (cancelled) return;
        if (
          error instanceof Error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }
        setStatus("failed");
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageNumber, width, shouldRender]);

  return (
    <div
      ref={wrapperRef}
      role="img"
      aria-label={label}
      // A document page: white in both themes until the canvas paints over it.
      className="relative shrink-0 bg-primary-foreground shadow-sm ring-1 ring-border-light"
      style={{ width, height: width * (measuredAspect ?? aspect) }}
    >
      <canvas ref={canvasRef} className="block size-full" />
      {status === "rendering" && shouldRender ? (
        <DocumentSkeleton
          label={`Rendering ${label}`}
          className="absolute inset-0"
        />
      ) : null}
      {status === "failed" ? (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-body-strong"
        >
          This page couldn’t be drawn.
        </p>
      ) : null}
    </div>
  );
}
