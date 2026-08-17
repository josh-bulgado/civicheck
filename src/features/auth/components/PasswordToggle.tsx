import { InputGroupAddon, InputGroupButton } from "~/components/ui/input-group";

/**
 * "Show" / "Hide" in words rather than an eye icon. The two eye glyphs are
 * routinely read the wrong way round — the word states what the next tap does,
 * which needs no interpretation from someone filling this in for the first time.
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
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={onToggle}
        className="h-7 px-2 text-[13px] font-bold text-muted-foreground hover:text-body-strong"
      >
        {shown ? "Hide" : "Show"}
      </InputGroupButton>
    </InputGroupAddon>
  );
}
