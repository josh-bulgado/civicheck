import { UserPlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeaderCard } from "~/components/ui/page-header-card";

export function StaffPageHeader({
  count,
  onInvite,
}: {
  count: number;
  onInvite: () => void;
}) {
  return (
    <PageHeaderCard
      title="Staff Management"
      description={`CCRO Administration, ${count} ${count === 1 ? "member" : "members"}`}
    >
      <Button variant="raised" size="lg" onClick={onInvite}>
        <UserPlus aria-hidden="true" data-icon="inline-start" />
        Invite Staff
      </Button>
    </PageHeaderCard>
  );
}
