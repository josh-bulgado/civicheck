import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Files, RotateCcw } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";

/**
 * True when this browser can open a live camera preview: a secure context
 * (https or localhost, which getUserMedia requires), the API itself, and a
 * pointer that isn't touch-first. Phones and tablets keep the file input's
 * `capture` hint, which hands off to the native camera app and is more reliable
 * there than a web preview.
 */
export function canUseBrowserCamera() {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  if (!navigator.mediaDevices?.getUserMedia) return false;
  return !window.matchMedia("(pointer: coarse)").matches;
}

type CameraState =
  | { phase: "requesting" }
  | { phase: "live" }
  | { phase: "captured"; previewUrl: string; file: File }
  | { phase: "blocked" }
  | { phase: "no-camera" }
  | { phase: "error" };

interface CameraCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name of the document being photographed, for the heading. */
  documentName: string;
  /** The photographed page, as a JPEG file ready to go through the upload path. */
  onCapture: (file: File) => void;
  /** Offered when the camera is blocked or missing. */
  onChooseFile: () => void;
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  documentName,
  onCapture,
  onChooseFile,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>({ phase: "requesting" });
  // Bumped to ask for a fresh stream, for Retake and for retrying after an error.
  const [attempt, setAttempt] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState({ phase: "requesting" });

    async function start() {
      try {
        // This is the call that makes the browser ask for permission.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          // Closed while the permission prompt was open: release the camera.
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        setState({ phase: "live" });
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setState({ phase: "blocked" });
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setState({ phase: "no-camera" });
        } else {
          setState({ phase: "error" });
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, attempt, stopStream]);

  // Attach the stream once the <video> exists (it only renders while live).
  useEffect(() => {
    if (state.phase !== "live") return;
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    void video.play().catch(() => {});
  }, [state.phase]);

  // A captured preview holds a blob URL; release it when it is replaced or the
  // dialog goes away.
  useEffect(() => {
    if (state.phase !== "captured") return;
    const url = state.previewUrl;
    return () => URL.revokeObjectURL(url);
  }, [state]);

  async function handleSnap() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setState({ phase: "error" });
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) {
      setState({ phase: "error" });
      return;
    }
    const file = new File([blob], `photo-${Date.now()}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    // The camera is no longer needed while the photo is being reviewed.
    stopStream();
    setState({ phase: "captured", previewUrl: URL.createObjectURL(blob), file });
  }

  const unavailable =
    state.phase === "blocked" ||
    state.phase === "no-camera" ||
    state.phase === "error";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          {/* Right padding keeps a long document name clear of the close button.
              This dialog renders in a portal, outside the wizard's contrast
              tokens, so the inks are set here rather than inherited. */}
          <DialogTitle className="pr-10 text-lg leading-snug font-bold text-foreground">
            Take a photo of {documentName}
          </DialogTitle>
          <DialogDescription className="text-[15px] leading-relaxed text-body-strong">
            Hold the page flat, fill the frame and make sure the text is sharp.
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-foreground/90">
          {state.phase === "captured" ? (
            <img
              src={state.previewUrl}
              alt="The photo you just took"
              className="size-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              aria-label="Live camera preview"
              className={
                state.phase === "live" ? "size-full object-contain" : "hidden"
              }
            />
          )}

          {state.phase === "requesting" ? (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white"
            >
              <Spinner className="size-5" aria-hidden="true" />
              <p>
                Allow camera access when your browser asks. The camera opens as
                soon as you do.
              </p>
            </div>
          ) : null}

          {unavailable ? (
            <div
              role="alert"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-white"
            >
              <p className="max-w-md font-semibold">
                {state.phase === "blocked"
                  ? "Camera access is blocked."
                  : state.phase === "no-camera"
                    ? "No camera was found on this device."
                    : "The camera couldn’t be started."}
              </p>
              <p className="max-w-md text-white/85">
                {state.phase === "blocked"
                  ? "Allow the camera for this site in your browser’s address bar or site settings, then try again. You can also choose a file instead."
                  : "You can choose a photo or PDF from this device instead."}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          {state.phase === "captured" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAttempt((count) => count + 1)}
              >
                <RotateCcw data-icon="inline-start" aria-hidden="true" />
                Retake
              </Button>
              <Button type="button" onClick={() => onCapture(state.file)}>
                Use photo
              </Button>
            </>
          ) : unavailable ? (
            <>
              {state.phase !== "no-camera" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttempt((count) => count + 1)}
                >
                  <RotateCcw data-icon="inline-start" aria-hidden="true" />
                  Try again
                </Button>
              ) : null}
              <Button type="button" onClick={onChooseFile}>
                <Files data-icon="inline-start" aria-hidden="true" />
                Choose a file
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={state.phase !== "live"}
                onClick={() => void handleSnap()}
              >
                <Camera data-icon="inline-start" aria-hidden="true" />
                Take photo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
