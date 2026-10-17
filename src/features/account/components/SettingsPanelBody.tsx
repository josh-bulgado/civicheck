import type * as React from "react";

/**
 * Scrolling region of a settings tab. Only this part scrolls, so a tab's
 * footer stays pinned to the bottom of the dialog when the viewport is short.
 * The 4px of padding (cancelled by the negative margin) keeps a focused
 * field's ring from being clipped at the scroll edge.
 */
export function SettingsPanelBody({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="-m-1 min-h-0 flex-1 overflow-y-auto p-1">{children}</div>;
}
