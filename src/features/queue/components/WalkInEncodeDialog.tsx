import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { encodeWalkInFn } from "~/features/queue/queue.mutations";
import { LANE_LABELS, QUEUE_LANES, type QueueLane } from "~/features/queue/queue.types";

export interface EncodableService {
  serviceCode: string;
  name: string;
  fee: number;
}

interface WalkInEncodeDialogProps {
  services: EncodableService[];
  defaultLane: QueueLane;
  onEncoded: () => void;
}

export function WalkInEncodeDialog({
  services,
  defaultLane,
  onEncoded,
}: WalkInEncodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serviceCode, setServiceCode] = useState("");
  const [lane, setLane] = useState<QueueLane>(defaultLane);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  function reset() {
    setServiceCode("");
    setLane(defaultLane);
    setFirstName("");
    setLastName("");
    setPurpose("");
    setContactNumber("");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const service = services.find((s) => s.serviceCode === serviceCode);
    if (!service) {
      toast.error("Pick the service being requested.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await encodeWalkInFn({
        data: {
          serviceCode: service.serviceCode,
          fee: service.fee,
          lane,
          subjectFirstName: firstName,
          subjectLastName: lastName,
          purpose,
          contactNumber,
        },
      });

      if (res.error) {
        toast.error("Could not encode this walk-in", { description: res.message });
        return;
      }

      toast.success(`Queue number ${res.ticketNumber}`, {
        description: `Tracking number ${res.trackingNumber}. Give both to the applicant.`,
        duration: 12000,
      });
      reset();
      setOpen(false);
      onEncoded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Encode walk-in
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Encode a walk-in</DialogTitle>
          <DialogDescription>
            For someone with no online request. This creates the request and
            issues a queue number in one step.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="walkin-service">Service requested</Label>
            <Select value={serviceCode} onValueChange={(v) => setServiceCode(v ?? "")}>
              <SelectTrigger id="walkin-service">
                <SelectValue placeholder="Select a service" />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.serviceCode} value={s.serviceCode}>
                    {s.name} — ₱{s.fee.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="walkin-first">First name</Label>
              <Input
                id="walkin-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="walkin-last">Last name</Label>
              <Input
                id="walkin-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="walkin-lane">Queue lane</Label>
              <Select value={lane} onValueChange={(v) => setLane(v as QueueLane)}>
                <SelectTrigger id="walkin-lane">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUEUE_LANES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="walkin-contact">Contact number (optional)</Label>
              <Input
                id="walkin-contact"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="walkin-purpose">Purpose (optional)</Label>
            <Input
              id="walkin-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border-light pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Encoding..." : "Encode & issue number"}
            </Button>
          </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
