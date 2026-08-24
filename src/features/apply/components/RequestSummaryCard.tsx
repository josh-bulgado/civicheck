interface RequestSummaryCardProps {
  subjects: Array<{
    role: string;
    name: string;
  }>;
  purpose?: string;
}

export function RequestSummaryCard({
  subjects,
  purpose,
}: RequestSummaryCardProps) {
  if (subjects.length === 0 && !purpose) return null;

  return (
    <div className="civic-card overflow-hidden">
      <div className="border-b border-border-light px-4.5 py-3.5 text-base font-bold text-foreground">
        Details so far
      </div>
      <div className="flex flex-col gap-2.5 px-4.5 py-4">
        {subjects.map((subject, index) => (
          <SummaryRow
            key={`${subject.role}-${index}`}
            label={
              subjects.length === 1 && subject.role === "Subject"
                ? "Record subject"
                : subject.role
            }
            value={subject.name}
          />
        ))}
        {purpose && <SummaryRow label="Purpose" value={purpose} />}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-bold text-foreground">
        {value}
      </span>
    </div>
  );
}
