import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

interface DisclosureProps {
  /** The words on the button that opens the section. */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Detail that stays out of the way until asked for. The button says what is
 * inside and turns its chevron when open, so nothing is hidden behind an icon.
 */
export function Disclosure({ label, className, children }: DisclosureProps) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group/trigger -ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-base font-semibold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[panel-open]/trigger:rotate-180 motion-reduce:transition-none"
        />
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("pt-2", className)}>{children}</CollapsibleContent>
    </Collapsible>
  );
}
