"use client";

import * as React from "react";
import { useHotkey, type HotkeyChord } from "@tanstack/react-hotkeys";
import { useRouterState } from "@tanstack/react-router";

const OPEN_EVENT = "civicheck:open-command-palette";

const CommandPaletteContent = React.lazy(() =>
  import("./command-palette-content").then((module) => ({
    default: module.CommandPaletteContent,
  })),
);

/** Opens and closes the palette; the sidebar search shows the same key. */
export const PALETTE_HOTKEY: HotkeyChord = "Mod+K";

/** Call from anywhere (a search button, a search pill) to open the palette. */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Keep only the hotkey and open event on the dashboard's critical path. */
export function CommandPalette({ userId = "" }: { userId?: string }) {
  const [open, setOpen] = React.useState(false);
  const [hasOpened, setHasOpened] = React.useState(false);

  const show = React.useCallback(() => {
    setHasOpened(true);
    setOpen(true);
  }, []);

  useHotkey(PALETTE_HOTKEY, () => {
    setHasOpened(true);
    setOpen((current) => !current);
  });

  React.useEffect(() => {
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, [show]);

  // The shell stays mounted across navigation, so close its overlay whenever
  // the destination changes.
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const lastPathname = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    setOpen(false);
  }, [pathname]);

  if (!hasOpened) return null;

  return (
    <React.Suspense fallback={null}>
      <CommandPaletteContent
        key={pathname}
        open={open}
        onOpenChange={setOpen}
        userId={userId}
      />
    </React.Suspense>
  );
}
