import { Search, UserRoundCog } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { RealtimeStatus } from "~/hooks/useRealtimeRefresh";
import { RealtimeStatusBadge } from "./RealtimeStatusBadge";

export function AccountsTableToolbar({
  value,
  onChange,
  placeholder,
  realtimeStatus,
  onReplaceAdministrator,
  replaceAdministratorLabel = "Replace CCRO Administrator",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  realtimeStatus: RealtimeStatus;
  onReplaceAdministrator?: () => void;
  replaceAdministratorLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 w-full sm:max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 rounded-lg pl-10 text-sm"
          />
        </div>
        <RealtimeStatusBadge status={realtimeStatus} />
      </div>
      {onReplaceAdministrator ? (
        <Button onClick={onReplaceAdministrator} className="sm:shrink-0">
          <UserRoundCog />
          {replaceAdministratorLabel}
        </Button>
      ) : null}
    </div>
  );
}
