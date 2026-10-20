import { QuietLink } from "~/components/quiet-link";
import { pillButton } from "~/components/portal/styles";
import { cn } from "~/lib/utils";

/**
 * Shown only when the dashboard has left a request out, and without a number:
 * the dashboard keeps no counts. A phone has no "All requests" pill in the title
 * row, so this is also its way to the full list.
 */
export function SeeAllRequestsLink() {
  return (
    <QuietLink
      to="/my-requests"
      className={cn(pillButton.light, "h-10 px-4.5 text-[15px] md:h-9 md:px-4 md:text-sm")}
    >
      See all requests
    </QuietLink>
  );
}
