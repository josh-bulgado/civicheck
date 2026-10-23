import { useMemo, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  ReportSheet,
  SHEET_SECTIONS,
  type SheetSectionKey,
  type SheetSections,
} from "~/features/admin/reports/components/ReportSheet";
import { ReportPanel } from "~/features/admin/reports/components/ReportPanel";
import {
  buildSummaryText,
  describeBusySeason,
  formatGeneratedAt,
  summarizeOffice,
} from "~/features/admin/reports/report-summary";
import { busiestBucket } from "~/features/admin/reports/report-volume";
import type {
  RequestVolumeData,
  ServiceReportData,
} from "~/features/admin/reports/reports.types";

interface SheetTabProps {
  volume: RequestVolumeData;
  report: ServiceReportData;
}

const ALL_SECTIONS: SheetSections = {
  summary: true,
  volume: true,
  services: true,
  seasons: true,
  signatures: true,
};

/**
 * The report as a page: choose what goes on it, then print it or copy its
 * summary into a message. Everything on the sheet comes from the same figures
 * as the other tabs, so the paper never disagrees with the screen.
 */
export function SheetTab({ volume, report }: SheetTabProps) {
  const [sections, setSections] = useState<SheetSections>(ALL_SECTIONS);

  const summary = useMemo(() => summarizeOffice(report), [report]);
  const generatedLabel = formatGeneratedAt(report.generatedAt);

  const copySummary = async () => {
    const text = buildSummaryText({
      summary,
      periodLabel: report.period.label,
      busiest: busiestBucket(volume.buckets),
      generatedLabel,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Summary copied. Paste it into a message or an email.");
    } catch {
      toast.error("The summary could not be copied. Print the sheet instead.");
    }
  };

  const toggle = (key: SheetSectionKey, checked: boolean) =>
    setSections((current) => ({ ...current, [key]: checked }));

  return (
    <div className="flex flex-col gap-4">
      <ReportPanel
        title="Choose What Goes on the Sheet"
        description="Everything is on by default. Turn off a part to leave it out of the printed page."
      >
        <ul className="flex flex-wrap gap-2">
          {SHEET_SECTIONS.map(({ key, label }) => (
            <li key={key}>
              <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-full border border-border-strong bg-card px-4 text-base font-medium">
                <Checkbox
                  checked={sections[key]}
                  onCheckedChange={(checked) => toggle(key, checked === true)}
                />
                {label}
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="raised" size="lg" onClick={() => window.print()}>
            <Printer aria-hidden="true" data-icon="inline-start" />
            Print or Save as PDF
          </Button>
          <Button variant="ghost" size="lg" onClick={copySummary}>
            <Copy aria-hidden="true" data-icon="inline-start" />
            Copy Summary
          </Button>
        </div>
      </ReportPanel>

      <ReportSheet
        sections={sections}
        summary={summary}
        buckets={volume.buckets}
        services={report.services}
        periodLabel={report.period.label}
        busySeason={describeBusySeason(report)}
        generatedLabel={generatedLabel}
      />
    </div>
  );
}
