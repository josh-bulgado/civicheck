import { CalendarRange, Layers } from "lucide-react";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { REPORT_PERIODS } from "~/features/admin/reports/service-report";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";

interface ReportFiltersProps {
  months: number;
  service: string | null;
  services: ServiceReportRow[];
  onChange: (next: { months?: number; service?: string }) => void;
}

/**
 * Period and service controls. Both write to the URL rather than local state,
 * so a particular view of the report is a shareable link and the browser's back
 * button restores the previous one.
 */
export function ReportFilters({
  months,
  service,
  services,
  onChange,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex min-w-52 flex-col gap-2">
        <Label
          htmlFor="report-period"
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          Reporting period
        </Label>
        <Select
          value={String(months)}
          onValueChange={(value) => onChange({ months: Number(value) })}
        >
          <SelectTrigger id="report-period" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {REPORT_PERIODS.map((period) => (
                <SelectItem key={period.months} value={String(period.months)}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {services.length > 0 ? (
        <div className="flex min-w-72 flex-col gap-2">
          <Label
            htmlFor="report-service"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            <Layers className="size-3.5" aria-hidden="true" />
            Service
          </Label>
          <Select
            value={service ?? services[0]?.key}
            // Base UI emits null when a select is cleared; ignore that rather
            // than dropping the service filter out of the URL entirely.
            onValueChange={(value) => {
              if (typeof value === "string") onChange({ service: value });
            }}
          >
            <SelectTrigger id="report-service" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {services.map((row) => (
                  <SelectItem key={row.key} value={row.key}>
                    {row.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
