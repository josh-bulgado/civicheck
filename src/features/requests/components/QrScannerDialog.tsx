import { useId, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  type QrScannerError,
  useQrScanner,
} from "~/features/requests/hooks/useQrScanner";
import { cn } from "~/lib/utils";

const ERROR_MESSAGES: Record<QrScannerError, string> = {
  "camera-disconnected":
    "Camera disconnected. Reconnect your camera or Iriun, then try again.",
  "camera-unavailable":
    "That camera is unavailable. Start Iriun or connect a camera, then try again or choose another camera.",
  "permission-denied":
    "Camera access was blocked. Allow camera access in your browser, then try again.",
  "startup-failed":
    "Could not start the camera scanner. Check that your camera or Iriun is running, or choose another camera.",
  unsupported:
    "Camera access requires HTTPS or localhost and a browser with camera support.",
};

interface QrScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the decoded QR text (the tracking number) — the dialog closes itself right after. */
  onDecode: (value: string) => void;
}

/**
 * Camera-based QR reader for the staff request queue. Decodes entirely in
 * the browser via jsQR — no server round trip, no dependency on CCRO owning
 * dedicated scanner hardware (a keyboard-wedge scanner already "types" into
 * the search box on its own; this covers staff who only have a phone/webcam).
 */
export function QrScannerDialog({ open, onOpenChange, onDecode }: QrScannerDialogProps) {
  const cameraInputId = useId();
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const { cameras, canvasRef, error, isStarting, retry, videoRef } =
    useQrScanner({
      active: open,
      deviceId: selectedCameraId,
      onDecode: (value) => {
        onDecode(value);
        onOpenChange(false);
      },
    });

  const cameraOptions = [
    { value: "", label: "Automatic camera" },
    ...cameras.map((camera, index) => ({
      value: camera.deviceId,
      label: camera.label || `Camera ${index + 1}`,
    })),
  ];
  if (
    selectedCameraId &&
    !cameras.some((camera) => camera.deviceId === selectedCameraId)
  ) {
    cameraOptions.push({
      value: selectedCameraId,
      label: "Selected camera (unavailable)",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan tracking QR</DialogTitle>
          <DialogDescription>
            Choose a camera, then hold the tracking QR in view. It scans automatically.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={cameraInputId}>Camera</FieldLabel>
            <div className="flex items-center gap-2">
              <Select
                items={cameraOptions}
                value={selectedCameraId}
                onValueChange={(value) => setSelectedCameraId(value ?? "")}
              >
                <SelectTrigger
                  id={cameraInputId}
                  aria-describedby={`${cameraInputId}-help`}
                  className="min-w-0 flex-1"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {cameraOptions.map((camera) => (
                      <SelectItem key={camera.value} value={camera.value}>
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={isStarting}
                onClick={retry}
              >
                {error ? "Try again" : "Refresh"}
              </Button>
            </div>
            <FieldDescription id={`${cameraInputId}-help`}>
              For your phone, choose Iriun Webcam and keep Iriun open on both devices.
            </FieldDescription>
          </Field>
        </FieldGroup>
        <div className="overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="aspect-video w-full object-contain"
            muted
            playsInline
          />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <p
          role="status"
          className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}
        >
          {(error ? ERROR_MESSAGES[error] : null) ??
            (isStarting
              ? "Starting camera. Allow camera access if your browser asks."
              : "Scanning… Point the camera at the tracking QR on the applicant's printout.")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
