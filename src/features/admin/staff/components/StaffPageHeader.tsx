import { UserPlus } from "lucide-react";
import { Button } from "~/components/ui/button";

export function StaffPageHeader({
  count,
  onInvite,
}: {
  count: number;
  onInvite: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border-strong bg-card px-5 py-4">
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          Staff Management
        </h1>
        <p className="text-sm text-muted-foreground">
          CCRO Administration, {count} {count === 1 ? "member" : "members"}
        </p>
      </div>
      <Button variant="raised" size="lg" onClick={onInvite}>
        <UserPlus aria-hidden="true" data-icon="inline-start" />
        Invite Staff
      </Button>
    </header>
  );
}
