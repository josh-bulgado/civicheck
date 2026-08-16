import type * as React from "react";

/**
 * Scrolling region of a settings tab. Only this part scrolls, so the dialog
 * keeps its square frame and each tab's footer stays pinned to the bottom.
 */
export function SettingsPanelBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-0 flex-1 overflow-y-auto pr-1">{children}</div>;
}
