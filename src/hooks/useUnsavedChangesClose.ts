import { useCallback, useRef, useState } from "react";

/**
 * The close path of a dialog that holds a form. Esc, the X, a click outside and Cancel all go
 * through `requestClose`, which asks first when there are unsaved changes. `closeNow` is for
 * after a successful save, and for discarding.
 *
 * The form reports its state with `trackDirty`. Pair it with `DiscardChangesDialog`, opened by
 * `confirmingDiscard`, and pause the form's shortcuts while that is open.
 */
export function useUnsavedChangesClose({
  isPending,
  onClose,
}: {
  isPending: boolean;
  onClose: () => void;
}) {
  const hasUnsavedChanges = useRef(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const trackDirty = useCallback((dirty: boolean) => {
    hasUnsavedChanges.current = dirty;
  }, []);

  function requestClose() {
    if (hasUnsavedChanges.current && !isPending) setConfirmingDiscard(true);
    else onClose();
  }

  function closeNow() {
    setConfirmingDiscard(false);
    onClose();
  }

  return { trackDirty, requestClose, closeNow, confirmingDiscard, setConfirmingDiscard };
}
