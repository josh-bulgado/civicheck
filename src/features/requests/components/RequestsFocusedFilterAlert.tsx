import { FilterX, Search } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { getStatusDetails } from "../request-workflow";
import type { RequestQueueFilters } from "../request-queue";

interface RequestsFocusedFilterAlertProps {
  filters: RequestQueueFilters;
  onClear: () => void;
}

/**
 * Shown when the queue was opened from an overview card deep link, so it's
 * obvious the list is narrowed and how to get back to everything.
 */
export function RequestsFocusedFilterAlert({
  filters,
  onClear,
}: RequestsFocusedFilterAlertProps) {
  const { status, payment } = filters;
  if (!status && !payment) return null;

  const subject = status
    ? `${getStatusDetails(status).label.toLowerCase()} requests`
    : "requests";

  return (
    <Alert>
      <Search aria-hidden="true" />
      <AlertTitle>Focused overview filter</AlertTitle>
      <AlertDescription>
        Showing {subject}
        {payment === "unpaid" ? " that still need payment verification" : ""}.
      </AlertDescription>
      <AlertAction>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Clear overview filter"
          onClick={onClear}
        >
          <FilterX data-icon="inline-start" aria-hidden="true" />
          Clear
        </Button>
      </AlertAction>
    </Alert>
  );
}
