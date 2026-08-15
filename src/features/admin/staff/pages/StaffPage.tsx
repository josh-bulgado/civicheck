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
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <StaffPageHeader />
      <StaffDataTable data={staff} departments={departments} />
    </div>
  );
}
