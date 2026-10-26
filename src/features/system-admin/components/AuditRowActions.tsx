import { useState } from "react";
import { Copy, Eye, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { formatAuditEventType } from "../audit-event.utils";
import type { NormalizedAuditEvent } from "../system-admin.types";

export function AuditRowActions({ event }: { event: NormalizedAuditEvent }) {
  const [open, setOpen] = useState(false);
  const label = formatAuditEventType(event.eventType);
  const details = [
    ["Event", label],
    ["Time", new Date(event.timestamp).toLocaleString()],
    [
      "Source",
      event.source === "sign-in"
        ? "Sign-In"
        : event.source === "system"
          ? "System"
          : "Request",
    ],
    ["Actor", event.actor],
    ["Device", event.deviceLabel ?? "Unrecognized device"],
    ["IP address", event.maskedIpAddress ?? "Unavailable"],
    ["Event ID", event.id],
    ...(event.targetId ? [["Target ID", event.targetId]] : []),
    ...(event.requestId ? [["Request ID", event.requestId]] : []),
  ];

  async function copyId() {
    try {
      await navigator.clipboard.writeText(event.id);
      toast.success("Event ID copied");
    } catch {
      toast.error(
        "Couldn't copy the event ID. Open event details to select it.",
      );
    }
  }

  return (
    <div className="audit-row-actions">
      <Button
        variant="ghost"
        size="icon-sm"
        shape="pill"
        aria-label={`View ${label} details`}
        onClick={() => setOpen(true)}
      >
        <Eye aria-hidden="true" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              shape="pill"
              aria-label={`More actions for ${label}`}
            />
          }
        >
          <MoreHorizontal aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Eye aria-hidden="true" /> View event details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void copyId()}>
            <Copy aria-hidden="true" /> Copy event ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Audit event details</DialogTitle>
            <DialogDescription>
              Metadata only. Citizen form data and documents are never included.
            </DialogDescription>
          </DialogHeader>
          <dl className="divide-y divide-border-lighter">
            {details.map(([name, value]) => (
              <div
                key={name}
                className="grid grid-cols-[100px_minmax(0,1fr)] gap-4 py-2.5"
              >
                <dt className="text-muted-foreground">{name}</dt>
                <dd className="break-words whitespace-normal">{value}</dd>
              </div>
            ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}
