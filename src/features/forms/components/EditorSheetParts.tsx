import type { ReactNode } from "react";
import { SquareCheckBig, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  SheetClose,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";

/**
 * Sheets portal out of the editor, so they opt back in to its type and control
 * sizing with this attribute.
 */
export const EDITOR_SHEET_PROPS = { "data-service-editor": "" } as const;

/** Icon tile, title, subtitle and a close button, over a divider. */
export function EditorSheetHeader({
  title,
  description,
}: {
  title: string;
  description: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3.5 border-b px-6 py-[22px]">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary"
      >
        <SquareCheckBig className="size-[22px]" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <SheetTitle className="text-lg font-bold tracking-tight">
          {title}
        </SheetTitle>
        <SheetDescription className="text-[13.5px] break-words">
          {description}
        </SheetDescription>
      </div>
      <SheetClose
        render={
          <Button
            type="button"
            variant="ghost"
            className="size-10 rounded-[10px] text-muted-foreground"
          />
        }
      >
        <X aria-hidden="true" />
        <span className="sr-only">Close</span>
      </SheetClose>
    </div>
  );
}
