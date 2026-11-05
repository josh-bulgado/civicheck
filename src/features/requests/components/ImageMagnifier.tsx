import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Search } from "lucide-react";
import { FilePreviewLoading } from "~/components/file-preview/FilePreviewLoading";
import { PreviewToolbar } from "~/components/file-preview/PreviewToolbar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

const IMAGE_ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const FIT_ZOOM_STEP = 2;
const MAGNIFICATIONS = [2, 3, 4, 5];
const MAGNIFIER_OPTIONS = MAGNIFICATIONS.map((value) => ({ value, label: `${value}×` }));
const LENS_SIZE = 200;

interface Lens {
  left: number;
  top: number;
  size: number;
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
}

function imageBounds(image: HTMLImageElement) {
  const rect = image.getBoundingClientRect();
  const scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const left = rect.left + (rect.width - width) / 2;
  const top = rect.top + (rect.height - height) / 2;
  return { left, top, width, height, right: left + width, bottom: top + height };
}

/** Whole-image zoom and an adjustable lens for inspecting small details. */
export function ImageMagnifier({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const zoomCenter = useRef<{ x: number; y: number } | null>(null);
  const instructionsId = useId();
  const switchId = useId();
  const [enabled, setEnabled] = useState(false);
  const [zoomStep, setZoomStep] = useState(FIT_ZOOM_STEP);
  const [magnification, setMagnification] = useState(3);
  const [lens, setLens] = useState<Lens | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const zoom = IMAGE_ZOOMS[zoomStep];
  const loaded = imageSize.width > 0;
  // Fit large scans into the canvas, while keeping small photos at their
  // natural size so the default preview doesn't make them blurry.
  const fit = loaded
    ? Math.min(
        1,
        Math.max(1, viewport.width - 48) / imageSize.width,
        Math.max(1, viewport.height - 48) / imageSize.height,
      )
    : 1;
  const imageWidth = imageSize.width * fit * zoom;
  const imageHeight = imageSize.height * fit * zoom;

  function changeImageZoom(step: number) {
    const scroller = scrollerRef.current;
    if (scroller) {
      zoomCenter.current = {
        x: (scroller.scrollLeft + scroller.clientWidth / 2) / scroller.scrollWidth,
        y: (scroller.scrollTop + scroller.clientHeight / 2) / scroller.scrollHeight,
      };
    }
    setLens(null);
    setZoomStep(step);
  }

  // Keep the same part of the document centered when the full image is zoomed.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const center = zoomCenter.current;
    if (!scroller || !center) return;
    scroller.scrollLeft = center.x * scroller.scrollWidth - scroller.clientWidth / 2;
    scroller.scrollTop = center.y * scroller.scrollHeight - scroller.clientHeight / 2;
    zoomCenter.current = null;
  }, [zoom]);

  // A resize or page scroll changes the image's position beneath the pointer.
  useEffect(() => {
    const hideLens = () => setLens(null);
    const observer = new ResizeObserver(() => {
      hideLens();
      const scroller = scrollerRef.current;
      if (scroller) {
        setViewport({ width: scroller.clientWidth, height: scroller.clientHeight });
      }
    });
    if (frameRef.current) observer.observe(frameRef.current);
    if (imageRef.current) observer.observe(imageRef.current);
    window.addEventListener("scroll", hideLens, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", hideLens, true);
    };
  }, []);

  function showLens(clientX: number, clientY: number) {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!enabled || !frame || !image?.naturalWidth) return;

    const frameRect = frame.getBoundingClientRect();
    const imageRect = imageBounds(image);
    // Use the image's actual bounds, excluding the space around a fitted photo.
    if (
      clientX < imageRect.left || clientX > imageRect.right ||
      clientY < imageRect.top || clientY > imageRect.bottom ||
      clientX < frameRect.left || clientX > frameRect.right ||
      clientY < frameRect.top || clientY > frameRect.bottom
    ) {
      setLens(null);
      return;
    }

    const size = Math.min(LENS_SIZE, frameRect.width, frameRect.height);
    setLens({
      left: Math.max(0, Math.min(clientX - frameRect.left - size / 2, frameRect.width - size)),
      top: Math.max(0, Math.min(clientY - frameRect.top - size / 2, frameRect.height - size)),
      size,
      imageWidth: imageRect.width,
      imageHeight: imageRect.height,
      x: (clientX - imageRect.left) / imageRect.width,
      y: (clientY - imageRect.top) / imageRect.height,
    });
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    showLens(event.clientX, event.clientY);
  }

  function moveWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-0.05, 0],
      ArrowRight: [0.05, 0],
      ArrowUp: [0, -0.05],
      ArrowDown: [0, 0.05],
    };
    const direction = directions[event.key];
    const image = imageRef.current;
    if (!enabled || !direction || !image?.naturalWidth) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = imageBounds(image);
    const x = Math.max(0, Math.min(1, (lens?.x ?? 0.5) + direction[0]));
    const y = Math.max(0, Math.min(1, (lens?.y ?? 0.5) + direction[1]));
    const frame = frameRef.current!.getBoundingClientRect();
    showLens(
      Math.max(frame.left, Math.min(frame.right - 1, rect.left + x * rect.width)),
      Math.max(frame.top, Math.min(frame.bottom - 1, rect.top + y * rect.height)),
    );
  }

  return (
    <div className="civic-content-in flex h-full min-h-0 w-full flex-col">
      <PreviewToolbar
        zoom={zoom}
        onZoomOut={() => changeImageZoom(Math.max(0, zoomStep - 1))}
        onZoomIn={() => changeImageZoom(Math.min(IMAGE_ZOOMS.length - 1, zoomStep + 1))}
        onFit={() => {
          zoomCenter.current = null;
          setLens(null);
          setZoomStep(FIT_ZOOM_STEP);
          scrollerRef.current?.scrollTo({ left: 0, top: 0 });
        }}
        canZoomOut={zoomStep > 0}
        canZoomIn={zoomStep < IMAGE_ZOOMS.length - 1}
        disabled={!loaded || failed}
      >
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {enabled ? (
            <Select
              items={MAGNIFIER_OPTIONS}
              value={magnification}
              onValueChange={(value) => {
                if (value !== null) setMagnification(value);
                setLens(null);
              }}
            >
              <SelectTrigger size="sm" aria-label="Magnifier zoom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false} className="min-w-20">
                <SelectGroup>
                  {MAGNIFICATIONS.map((value) => (
                    <SelectItem key={value} value={value}>{value}×</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null}
          <label htmlFor={switchId} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            Magnifier
          </label>
          <Switch
            id={switchId}
            checked={enabled}
            disabled={!loaded || failed}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              setLens(null);
            }}
          />
        </div>
      </PreviewToolbar>
      <div
        ref={frameRef}
        role="region"
        aria-label={`Inspect ${alt}`}
        aria-busy={!loaded && !failed}
        aria-describedby={instructionsId}
        tabIndex={0}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border-light bg-surface-subtle outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          enabled && "touch-none cursor-crosshair",
        )}
        onPointerEnter={movePointer}
        onPointerMove={movePointer}
        onPointerDown={(event) => {
          if (!enabled) return;
          if (event.pointerType !== "mouse") {
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          movePointer(event);
        }}
        onPointerUp={(event) => {
          if (event.pointerType !== "mouse") setLens(null);
        }}
        onPointerLeave={() => setLens(null)}
        onPointerCancel={() => setLens(null)}
        onFocus={(event) => {
          if (!event.currentTarget.matches(":focus-visible")) return;
          const image = imageRef.current;
          if (!image?.naturalWidth) return;
          const rect = imageBounds(image);
          const frame = event.currentTarget.getBoundingClientRect();
          showLens(
            (Math.max(rect.left, frame.left) + Math.min(rect.right, frame.right)) / 2,
            (Math.max(rect.top, frame.top) + Math.min(rect.bottom, frame.bottom)) / 2,
          );
        }}
        onBlur={() => setLens(null)}
        onKeyDown={moveWithKeyboard}
      >
        <div
          ref={scrollerRef}
          className={cn("absolute inset-0 overflow-auto", enabled && "touch-none")}
        >
          <div
            className="flex min-h-full min-w-full items-center justify-center p-6"
            style={{ width: Math.max(viewport.width, imageWidth + 48), height: Math.max(viewport.height, imageHeight + 48) }}
          >
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              draggable={false}
              onLoad={(event) => {
                setImageSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
                setFailed(false);
              }}
              onError={() => {
                setFailed(true);
                onError?.();
              }}
              className={cn(
                "block max-w-none shrink-0 rounded-sm ring-1 ring-border-light select-none",
                loaded && !failed ? "civic-enter-fade" : "invisible",
              )}
              style={{ width: imageWidth || undefined, height: imageHeight || undefined }}
            />
          </div>
        </div>
        {!loaded && !failed ? <FilePreviewLoading label="Loading image" className="absolute inset-0" /> : null}
        {failed ? (
          <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-body-strong">
            This preview couldn’t be loaded. Close it and try again, or open the file in a new tab.
          </p>
        ) : null}
        {enabled && lens && (
          <div
            aria-hidden="true"
            data-image-magnifier-lens
            className="pointer-events-none absolute overflow-hidden rounded-full border-2 border-primary bg-background shadow-xl ring-4 ring-background/80"
            style={{ left: lens.left, top: lens.top, width: lens.size, height: lens.size }}
          >
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                width: lens.imageWidth * magnification,
                height: lens.imageHeight * magnification,
                left: lens.size / 2 - lens.x * lens.imageWidth * magnification - 2,
                top: lens.size / 2 - lens.y * lens.imageHeight * magnification - 2,
              }}
            />
            <span className="absolute inset-x-0 bottom-2 mx-auto w-fit rounded-full bg-foreground/80 px-2 py-0.5 text-xs font-semibold text-background">
              {magnification}×
            </span>
          </div>
        )}
      </div>
      <p
        id={instructionsId}
        className={cn(
          "shrink-0 px-1 pt-2 text-xs text-muted-foreground",
          !enabled && "sr-only",
        )}
      >
        Hover or drag to magnify
        <span className="sr-only">. Focus the image and use Shift + arrow keys to move the {magnification}× lens. Turn the magnifier off to scroll with touch.</span>
      </p>
    </div>
  );
}
