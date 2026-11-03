import { useHotkeys } from "@tanstack/react-hotkeys";

/**
 * Things that already use Escape to close themselves: a dialog, a drawer, a
 * menu or a list, and any inline panel that marks itself with this attribute.
 */
const ESCAPE_OWNERS =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-captures-escape]';

function isTyping(element: Element | null) {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.isContentEditable ||
    element.tagName === "INPUT" ||
    element.tagName === "TEXTAREA" ||
    element.tagName === "SELECT"
  );
}

/**
 * Escape leaves the page, but only when nothing else is waiting for it. A press
 * that closes a dialog, a menu or an open panel, or that leaves a text field,
 * is spent on that and never also takes the user off the page.
 */
export function useEscapeToLeave({
  enabled,
  onLeave,
}: {
  enabled: boolean;
  onLeave: () => void;
}) {
  useHotkeys([
    {
      hotkey: "Escape",
      callback: () => {
        if (isTyping(document.activeElement)) return;
        if (document.querySelector(ESCAPE_OWNERS)) return;
        onLeave();
      },
      options: { enabled },
    },
  ]);
}
