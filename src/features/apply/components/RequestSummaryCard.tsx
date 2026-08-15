import { formatFee } from "~/features/services/service-utils";

interface RequestSummaryCardProps {
  serviceName: string;
  fee: number | string;
  subjectName?: string;
  purpose?: string;
}

export function RequestSummaryCard({
  serviceName,
  fee,
  subjectName,
  purpose,
}: RequestSummaryCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-strong bg-white">
      <div className="border-b border-border-light px-4.5 py-3.5 text-base font-bold text-foreground">
        Your request
      </div>
      <div className="flex flex-col gap-2.5 px-4.5 py-4">
        <SummaryRow label="Service" value={serviceName} />
        {subjectName && <SummaryRow label="Subject" value={subjectName} />}
        {purpose && <SummaryRow label="Purpose" value={purpose} />}
        <SummaryRow label="Fee at cashier" value={formatFee(fee)} />
        <div className="h-px bg-border-lighter" />
        <p className="text-sm leading-relaxed text-body">
          Nothing is paid online. Bring cash on your appointment date.
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-bold text-foreground">{value}</span>
    </div>
  );
}
