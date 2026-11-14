import { Plus } from "lucide-react";
import { QuietLink } from "~/components/quiet-link";
import { pillButton } from "~/components/portal/styles";
import { buttonVariants } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export function MyRequestsPageHeader() {
  return (
    <div className="flex items-center justify-between gap-x-6 gap-y-3">
      <h1 className="portal-title">My requests</h1>
      <QuietLink to="/services" aria-label="New request" className={cn(
        buttonVariants(), pillButton.primary,
        "h-14 gap-2.5 px-7 text-base shadow-portal-button max-md:size-12 max-md:gap-0 max-md:px-0",
      )}>
        <Plus className="size-4.5 max-md:size-5.5" aria-hidden="true" />
        <span className="max-md:sr-only">New request</span>
      </QuietLink>
    </div>
  );
}
