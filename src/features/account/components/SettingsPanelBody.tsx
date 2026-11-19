import type * as React from "react";

/**
 * Scrolling region of a settings tab. Only this part scrolls, so a tab's
 * footer stays pinned to the bottom of the dialog when the viewport is short.
 * The side padding is the dialog's content gutter, and it also keeps a focused
 * field's ring from being clipped at the scroll edge; the 4px of vertical
 * padding does the same top and bottom.
 */
export function SettingsPanelBody({
  children,
  disabled,
  label,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-1 md:px-8">
      <fieldset disabled={disabled} aria-label={label} className="min-w-0 border-0 p-0">
        {children}
      </fieldset>
    </div>
  );
}
