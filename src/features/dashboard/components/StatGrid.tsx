import { CheckCircle, Clock3, CreditCard, FileText } from "lucide-react";
import { StatTile } from "./StatTile";

interface StatGridProps {
  total: number;
  inProgress: number;
  readyForRelease: number;
  paymentDue: number;
}

export function StatGrid({
  total,
  inProgress,
  readyForRelease,
  paymentDue,
}: StatGridProps) {
  return (
    <div className="civic-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile
        index={0}
        icon={FileText}
        label="All requests"
        value={total}
        accent="bg-primary"
      />
      <StatTile
        index={1}
        icon={Clock3}
        label="In progress"
        value={inProgress}
        accent="bg-primary"
      />
      <StatTile
        index={2}
        icon={CheckCircle}
        label="Ready for release"
        value={readyForRelease}
        accent="bg-success"
      />
      <StatTile
        index={3}
        icon={CreditCard}
        label="Payment due"
        value={paymentDue}
        accent="bg-brand-gold"
      />
    </div>
  );
}
