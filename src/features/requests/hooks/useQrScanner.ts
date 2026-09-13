import { useEffect, useRef, useState } from "react";

const MAX_SCAN_DIMENSION = 640;
const SCAN_INTERVAL_MS = 150;

export type QrScannerError =
  | "camera-disconnected"
  | "camera-unavailable"
  | "permission-denied"
  | "startup-failed"
  | "unsupported";

interface UseQrScannerOptions {
  active: boolean;
  deviceId: string;
  onDecode: (value: string) => void;
}

export function useQrScanner({ active, deviceId, onDecode }: UseQrScannerOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onDecodeRef = useRef(onDecode);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<QrScannerError | null>(null);

  useEffect(() => {
    onDecodeRef.current = onDecode;
  }, [onDecode]);

  useEffect(() => {
    if (!active) return;

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      setError("unsupported");
      setIsStarting(false);
      return;
    }

    let disposed = false;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    let context: CanvasRenderingContext2D | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let decode: typeof import("jsqr").default;

    setError(null);
    setIsStarting(true);

    async function refreshCameras() {
      try {
        const devices = await mediaDevices.enumerateDevices();
        if (!disposed) {
          setCameras(
            devices.filter(
              (device) => device.kind === "videoinput" && device.deviceId,
            ),
          );
        }
      } catch {
        // Camera capture can still work if the browser cannot list devices.
      }
    }

    function stop() {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      stream?.getTracks().forEach((track) => {
        track.removeEventListener("ended", handleDisconnected);
        track.stop();
      });
      if (video?.srcObject === stream) video.srcObject = null;
      stream = null;
    }

    function handleDisconnected() {
      if (cancelled) return;
      stop();
      setIsStarting(false);
      setError("camera-disconnected");
      void refreshCameras();
    }

    function scheduleScan() {
      timer = setTimeout(scanFrame, SCAN_INTERVAL_MS);
    }

    function scanFrame() {
      if (cancelled) return;

      const canvas = canvasRef.current;
      if (
        !video ||
        !canvas ||
        video.readyState < video.HAVE_CURRENT_DATA ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        scheduleScan();
        return;
      }

      const scale = Math.min(
        1,
        MAX_SCAN_DIMENSION / Math.max(video.videoWidth, video.videoHeight),
      );
      const width = Math.max(1, Math.round(video.videoWidth * scale));
      const height = Math.max(1, Math.round(video.videoHeight * scale));

      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      context ??= canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        stop();
        setError("startup-failed");
        return;
      }

      context.drawImage(video, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const code = decode(imageData.data, width, height);

      if (code?.data) {
        stop();
        onDecodeRef.current(code.data);
        return;
      }

      scheduleScan();
    }

    async function start() {
      try {
        ({ default: decode } = await import("jsqr"));
        if (cancelled) return;

        stream = await mediaDevices.getUserMedia({
          video: {
            ...(deviceId
              ? { deviceId: { exact: deviceId } }
              : { facingMode: "environment" }),
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (cancelled) {
          stop();
          return;
        }

        void refreshCameras();
        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", handleDisconnected);
        });

        video = videoRef.current;
        if (!video) {
          stop();
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        setIsStarting(false);
        scanFrame();
      } catch (caught) {
        if (cancelled) return;

        stop();
        setIsStarting(false);
        const name = caught instanceof DOMException ? caught.name : "";
        setError(
          name === "NotAllowedError"
            ? "permission-denied"
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "camera-unavailable"
              : "startup-failed",
        );
      }
    }

    void refreshCameras();
    mediaDevices.addEventListener("devicechange", refreshCameras);
    void start();

    return () => {
      disposed = true;
      mediaDevices.removeEventListener("devicechange", refreshCameras);
      stop();
    };
  }, [active, deviceId, retryToken]);

  return {
    cameras,
    canvasRef,
    error,
    isStarting,
    retry: () => setRetryToken((value) => value + 1),
    videoRef,
  };
}
