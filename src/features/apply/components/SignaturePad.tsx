import { useRef, type PointerEvent } from "react";
import { Button } from "~/components/ui/button";
import { RequiredMark } from "~/components/ui/required-mark";

export function SignaturePad({ onChange, disabled }: {
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const moved = useRef(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return [(event.clientX - rect.left) * 600 / rect.width,
      (event.clientY - rect.top) * 200 / rect.height] as const;
  }

  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (moved.current) onChange(event.currentTarget.toDataURL("image/png"));
  }

  return (
    <section className="rounded-[18px] border border-border-light p-5">
      <h2 className="text-lg font-bold">Certification and signature <RequiredMark /></h2>
      <p className="mt-2 text-base">I hereby certify that the above information is true and correct.</p>
      <p id="signature-help" className="mt-2 text-sm text-muted-foreground">
        Requester: draw your signature below using your finger, stylus, or mouse.
        It will appear on your verification form.
      </p>
      <canvas
        ref={canvas}
        width={600}
        height={200}
        aria-label="Requester signature drawing area"
        aria-describedby="signature-help"
        className="mt-4 block w-full touch-none rounded-lg border border-border-strong bg-white"
        style={{ aspectRatio: "3 / 1" }}
        onPointerDown={(event) => {
          if (disabled || pointer.current !== null || event.button !== 0) return;
          const context = event.currentTarget.getContext("2d");
          if (!context) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          pointer.current = event.pointerId;
          moved.current = false;
          context.beginPath();
          context.moveTo(...point(event));
          context.strokeStyle = "#111111";
          context.lineWidth = 2.5;
          context.lineCap = "round";
          context.lineJoin = "round";
        }}
        onPointerMove={(event) => {
          if (disabled || pointer.current !== event.pointerId) return;
          const context = event.currentTarget.getContext("2d");
          if (!context) return;
          context.lineTo(...point(event));
          context.stroke();
          moved.current = true;
        }}
        onPointerUp={finish}
        onPointerCancel={finish}
        onLostPointerCapture={finish}
      />
      <Button type="button" variant="outline" className="mt-3" disabled={disabled}
        onClick={() => {
          canvas.current?.getContext("2d")?.clearRect(0, 0, 600, 200);
          onChange("");
        }}>Clear signature</Button>
    </section>
  );
}
