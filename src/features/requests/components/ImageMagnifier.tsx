import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";

const IMAGE_ZOOMS = [1, 1.5, 2, 3];
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
export function ImageMagnifier({ src, alt }: { src: string; alt: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const zoomCenter = useRef<{ x: number; y: number } | null>(null);
  const instructionsId = useId();
  const [enabled, setEnabled] = useState(false);
  const [zoomStep, setZoomStep] = useState(0);
  const [magnification, setMagnification] = useState(3);
  const [lens, setLens] = useState<Lens | null>(null);
  const zoom = IMAGE_ZOOMS[zoomStep];

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
    const observer = new ResizeObserver(hideLens);
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
    <div className="relative h-full w-full">
      <div
        ref={frameRef}
        role="region"
        aria-label={`Inspect ${alt}`}
        aria-describedby={instructionsId}
        tabIndex={0}
        className={cn(
          "relative h-full w-full overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
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
          className={cn("absolute inset-0 overflow-auto rounded-md", enabled && "touch-none")}
        >
          <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
            <img
              ref={imageRef}
              src={src}
              alt={alt}
              draggable={false}
              className="block h-full w-full object-contain select-none"
            />
          </div>
        </div>
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
      <div className="absolute top-2 right-2 flex max-w-[calc(100%-1rem)] flex-wrap justify-end gap-2">
        <div
          role="group"
          aria-label="Image zoom"
          className="flex items-center gap-0.5 rounded-lg bg-background/90 p-0.5 shadow-sm ring-1 ring-border"
        >
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            title="Zoom out the whole image"
            disabled={zoomStep === 0}
            onClick={() => changeImageZoom(zoomStep - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-w-10 px-1 tabular-nums"
            aria-label="Fit image to preview"
            title="Reset image zoom to fit"
            onClick={() => changeImageZoom(0)}
          >
            {zoom === 1 ? "Fit" : `${zoom * 100}%`}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            title="Zoom in the whole image"
            disabled={zoomStep === IMAGE_ZOOMS.length - 1}
            onClick={() => changeImageZoom(zoomStep + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <div
          role="group"
          aria-label="Magnifier settings"
          className="flex items-center gap-1 rounded-lg bg-background/90 p-0.5 shadow-sm ring-1 ring-border"
        >
          <Button
            variant={enabled ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={enabled}
            title="Turn the magnifier on or off"
            onClick={() => {
              setEnabled((current) => !current);
              setLens(null);
            }}
          >
            <Search aria-hidden="true" />
            Magnifier
          </Button>
          <Select
            items={MAGNIFIER_OPTIONS}
            value={magnification}
            disabled={!enabled}
            onValueChange={(value) => {
              if (value !== null) setMagnification(value);
              setLens(null);
            }}
          >
            <SelectTrigger size="sm" aria-label="Magnifier zoom" title="Choose magnifier zoom">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false} className="min-w-20">
              {MAGNIFICATIONS.map((value) => (
                <SelectItem key={value} value={value}>{value}×</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p
        id={instructionsId}
        className={cn(
          "pointer-events-none absolute bottom-2 left-2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground",
          !enabled && "sr-only",
        )}
      >
        Hover or drag to magnify
        <span className="sr-only">. Focus the image and use Shift + arrow keys to move the {magnification}× lens. Turn the magnifier off to scroll with touch.</span>
      </p>
    </div>
  );
}
