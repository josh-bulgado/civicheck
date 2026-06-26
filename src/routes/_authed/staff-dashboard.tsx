import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard, Construction } from "lucide-react";

export const Route = createFileRoute("/_authed/staff-dashboard")({
  component: StaffDashboard,
});

function StaffDashboard() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Staff Dashboard
        </h1>
        <p className="text-muted-foreground text-sm">
          This is the CCRO staff dashboard. Request queue, pre-validation
          review, and processing tools will be available here.
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5">
          <Construction className="w-3.5 h-3.5" />
          <span>Under construction</span>
        </div>
      </div>
    </div>
  );
}
