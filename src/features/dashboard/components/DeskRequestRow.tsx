import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "~/components/ui/item";
import { StageStatus } from "~/features/dashboard/components/StageStatus";
import { WaitPill } from "~/features/dashboard/components/WaitPill";
import type { DeskRequest } from "~/features/dashboard/staff-desk";

/** One request on the dashboard: how long it has waited, who it is for, where it is. */
export function DeskRequestRow({ request }: { request: DeskRequest }) {
  return (
    <Item
      size="sm"
      className="gap-4 rounded-none px-5"
      render={<Link to="/requests/$requestId" params={{ requestId: request.id }} />}
    >
      <WaitPill wait={request.wait} tone={request.tone} />
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="font-mono">{request.trackingNumber}</ItemTitle>
        <ItemDescription className="line-clamp-1">
          <span className="font-medium text-foreground/80">{request.applicantName}</span>
          {" · "}
          {request.serviceName}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <StageStatus request={request} className="text-muted-foreground" />
      </ItemActions>
      <ChevronRight className="size-4.5 text-muted-foreground" aria-hidden="true" />
    </Item>
  );
}
