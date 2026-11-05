import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { cancelOwnCtcBirthRequestFn } from "../applicant-requests.mutations";

export function CancelRequestCard({ requestId, onCancelled }: {
  requestId: string;
  onCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRequest = useServerFn(cancelOwnCtcBirthRequestFn);

  async function handleCancel() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await cancelRequest({ data: { requestId } });
      if (result.error) {
        setError(result.message ?? "The request could not be cancelled. Try again.");
        return;
      }
      setOpen(false);
      toast.success("Request cancelled.");
      onCancelled();
    } catch {
      setError("The request could not be cancelled. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[28px] bg-card p-6 shadow-portal-card ring-2 ring-border-light md:p-7">
      <h2 className="text-[22px] font-semibold">Need to cancel?</h2>
      <p className="mt-2 mb-4 text-base text-muted-foreground">
        You can cancel before staff starts checking. To fix a mistake, cancel and submit a new request.
      </p>
      <Button variant="outline" onClick={() => { setError(null); setOpen(true); }}>Cancel request</Button>
      <Dialog open={open} onOpenChange={(value) => { if (!pending) setOpen(value); }}>
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Cancel this request?</DialogTitle>
            <DialogDescription>
              If you need to fix a mistake, you?ll need to submit a new request.
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setOpen(false)}>Keep request</Button>
            <Button variant="destructive" disabled={pending} onClick={handleCancel}>
              {pending ? "Cancelling..." : "Cancel request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
