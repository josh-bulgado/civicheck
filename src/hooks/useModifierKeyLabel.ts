import { useEffect, useState } from "react";

/**
 * The label for the shortcut modifier: "⌘" on Apple platforms, "Ctrl"
 * elsewhere. Starts as "Ctrl" so server and first client render agree, then
 * switches after mount on a Mac. Key handlers already accept metaKey or ctrlKey.
 */
export function useModifierKeyLabel() {
  const [label, setLabel] = useState("Ctrl");

  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/i.test(navigator.platform)) setLabel("⌘");
  }, []);

  return label;
}
