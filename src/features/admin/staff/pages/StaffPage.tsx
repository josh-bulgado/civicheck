import type { Department, StaffMember } from "../staff.types";
import { StaffPageHeader } from "../components/StaffPageHeader";
import { StaffDataTable } from "../components/StaffDataTable";

export default function StaffPage({
  staff,
  departments,
}: {
  staff: StaffMember[];
  departments: Department[];
}) {
  return (
    <div className="dashboard-page">
      <StaffPageHeader />
      <section className="dashboard-panel overflow-hidden">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
            Personnel directory
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            Staff access and assignments
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite personnel and manage their roles, departments, and account
            status.
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <StaffDataTable data={staff} departments={departments} />
        </div>
      </section>
    </div>
  );
}
