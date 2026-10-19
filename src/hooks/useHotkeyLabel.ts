import { useSyncExternalStore } from "react";
import {
  detectPlatform,
  formatForDisplay,
  type DisplayHotkey,
} from "@tanstack/react-hotkeys";

const subscribe = () => () => {};

/**
 * Formats a hotkey for a `Kbd` hint, as `⌘S` on a Mac and `Ctrl+S` elsewhere.
 *
 * The server can't tell the platform, so it renders the Linux label. Reading
 * the platform through `useSyncExternalStore` keeps hydration quiet: the first
 * client render matches the server, then switches to the real label.
 */
export function useHotkeyLabel() {
  const platform = useSyncExternalStore(
    subscribe,
    detectPlatform,
    () => "linux" as const,
  );
  return (hotkey: DisplayHotkey) => formatForDisplay(hotkey, { platform });
}
