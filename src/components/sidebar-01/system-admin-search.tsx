"use client";

import { Search } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { openCommandPalette, PALETTE_HOTKEY } from "./command-palette";
import { cn } from "~/lib/utils";

export function SystemAdminSearch({ className, compact = false }: { className?: string; compact?: boolean }) {
  const hotkeyLabel = useHotkeyLabel();

  return (
    <Button
      type="button"
      variant="outline"
      shape={compact ? "default" : "pill"}
      aria-label="Search CiviCheck navigation"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      className={cn("h-10 w-60 min-w-0 shrink justify-start gap-2.5 border-border bg-card px-3 text-muted-foreground shadow-none transition-colors hover:bg-card hover:text-foreground", className)}
      onClick={openCommandPalette}
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="truncate text-sm font-normal">Search</span>
      <Kbd className="ml-auto hidden bg-muted text-[10px] text-muted-foreground sm:inline-flex">
        {hotkeyLabel(PALETTE_HOTKEY)}
      </Kbd>
    </Button>
  );
}
