import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { MIN_SAMPLE } from "~/features/admin/reports/service-report";

/**
 * Shown in place of a chart when the sample is too small to describe anything.
 *
 * Deliberately states the real count rather than hiding it: an admin should be
 * able to see that the office has data, just not enough of it yet, without
 * being shown a "trend" drawn from three requests.
 */
export function InsufficientData({
  count,
  noun = "requests",
}: {
  count: number;
  noun?: string;
}) {
  return (
    <Alert className="civic-enter-sm">
      <Info aria-hidden="true" />
      <AlertTitle>Not Enough Data Yet</AlertTitle>
      <AlertDescription>
        {count === 0
          ? `No ${noun} in this period.`
          : `Only ${count.toLocaleString("en-PH")} ${count === 1 ? noun.replace(/s$/, "") : noun} in this period.`}{" "}
        A breakdown needs at least {MIN_SAMPLE} before it describes a pattern
        rather than a handful of individual cases.
      </AlertDescription>
    </Alert>
  );
}
