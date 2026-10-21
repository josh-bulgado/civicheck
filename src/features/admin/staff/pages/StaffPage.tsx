import { useState } from "react";
import type { Department, StaffMember } from "../staff.types";
import { StaffPageHeader } from "../components/StaffPageHeader";
import { StaffDataTable } from "../components/StaffDataTable";
import { StaffInviteDialog } from "../components/StaffInviteDialog";

export default function StaffPage({
  staff,
  departments,
}: {
  staff: StaffMember[];
  departments: Department[];
}) {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="dashboard-page">
      <StaffPageHeader
        count={staff.length}
        onInvite={() => setInviteOpen(true)}
      />
      <StaffDataTable data={staff} departments={departments} />
      <StaffInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        departments={departments}
      />
    </div>
  );
}
