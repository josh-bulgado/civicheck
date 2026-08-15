import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { TicketCard } from "~/features/queue/components/TicketCard";
import {
  WalkInEncodeDialog,
  type EncodableService,
} from "~/features/queue/components/WalkInEncodeDialog";
import {
  callNextFn,
  issueTicketByTrackingFn,
  updateTicketStatusFn,
} from "~/features/queue/queue.mutations";
import {
  LANE_LABELS,
  QUEUE_LANES,
  type QueueCounter,
  type QueueLane,
  type QueueTicket,
} from "~/features/queue/queue.types";

const LIVE_STATUSES = ["waiting", "called", "serving"];

interface QueueDeskConsoleProps {
  tickets: QueueTicket[];
  counters: QueueCounter[];
  services: EncodableService[];
  onChanged: () => void;
}

export function QueueDeskConsole({
  tickets,
  counters,
  services,
  onChanged,
}: QueueDeskConsoleProps) {
  const [lane, setLane] = useState<QueueLane>("application");
  const [counterId, setCounterId] = useState<string>(counters[0]?.id ?? "");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const byLane = useMemo(() => {
    const map = new Map<string, QueueTicket[]>();
    for (const l of QUEUE_LANES) map.set(l, []);
    for (const t of tickets) {
      map.get(t.lane)?.push(t);
    }
    return map;
  }, [tickets]);

  const laneTickets = byLane.get(lane) ?? [];
  const live = laneTickets.filter((t) => LIVE_STATUSES.includes(t.status));
  const done = laneTickets.filter((t) => !LIVE_STATUSES.includes(t.status));

  async function handleCallNext() {
    if (!counterId) {
      toast.error("Pick which counter you're calling from.");
      return;
    }
    setBusy(true);
    try {
      const res = await callNextFn({ data: { lane, counterId } });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success(`Now calling ${res.ticketNumber}`);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleIssue(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await issueTicketByTrackingFn({ data: { trackingNumber, lane } });
      if (res.error) {
        toast.error("Could not issue a number", { description: res.message });
        return;
      }
      toast.success(`Queue number ${res.ticketNumber}`);
      setTrackingNumber("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleTicketAction(
    ticketId: string,
    action: "serving" | "served" | "no_show" | "cancelled",
  ) {
    setBusy(true);
    try {
      const res = await updateTicketStatusFn({ data: { ticketId, action } });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={lane} onValueChange={(v) => setLane(v as QueueLane)}>
        <TabsList>
          {QUEUE_LANES.map((l) => {
            const waiting = (byLane.get(l) ?? []).filter((t) => t.status === "waiting").length;
            return (
              <TabsTrigger key={l} value={l}>
                {LANE_LABELS[l]}
                {waiting > 0 && (
                  <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                    {waiting}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {QUEUE_LANES.map((l) => (
          <TabsContent key={l} value={l} className="mt-6 flex flex-col gap-6">
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-white p-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="counter">Serving from</Label>
                <Select value={counterId} onValueChange={(v) => setCounterId(v ?? "")}>
                  <SelectTrigger id="counter" className="w-48">
                    <SelectValue placeholder="Pick a counter" />
                  </SelectTrigger>
                  <SelectContent>
                    {counters.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCallNext} disabled={busy}>
                Call next
              </Button>

              <form onSubmit={handleIssue} className="flex flex-1 items-end gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <Label htmlFor="tracking">Issue a number by tracking number</Label>
                  <Input
                    id="tracking"
                    placeholder="CCRO-2026-000123"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="outline" disabled={busy || !trackingNumber}>
                  Issue
                </Button>
              </form>

              <WalkInEncodeDialog
                services={services}
                defaultLane={l}
                onEncoded={onChanged}
              />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                In the queue ({live.length})
              </h3>
              {live.length === 0 ? (
                <p className="rounded-xl border border-dashed border-dashed-border bg-white p-6 text-center text-sm italic text-muted-foreground">
                  Nobody is waiting in {LANE_LABELS[l]} right now.
                </p>
              ) : (
                live.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    busy={busy}
                    onAction={(action) => handleTicketAction(ticket.id, action)}
                  />
                ))
              )}
            </div>

            {done.length > 0 && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Finished today ({done.length})
                </h3>
                {done.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
