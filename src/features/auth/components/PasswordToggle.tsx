import { InputGroupAddon, InputGroupButton } from "~/components/ui/input-group";

/**
 * "Show" / "Hide" in words rather than an eye icon. The two eye glyphs are
 * routinely read the wrong way round — the word states what the next tap does,
 * which needs no interpretation from someone filling this in for the first time.
 *
 * The state lives in the label, not in `aria-pressed`: a pressed state on top of
 * a label that already flips between "Show" and "Hide" gets announced twice.
 */
export function PasswordToggle({
  shown,
  onToggle,
}: {
  shown: boolean;
  onToggle: () => void;
}) {
  return (
    <InputGroupAddon align="inline-end">
      <InputGroupButton
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={onToggle}
        className="h-9 px-3 text-[13px] font-bold text-muted-foreground hover:text-body-strong"
      >
        {shown ? "Hide" : "Show"}
      </InputGroupButton>
    </InputGroupAddon>
  );
}
