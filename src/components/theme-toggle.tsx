import { Moon, Sun } from "lucide-react";
import { cn } from "~/lib/utils";
import { setThemePreference, useThemePreference } from "~/lib/theme";

/** Round icon button in the portal's chrome: moon to go dark, sun to go light. */
export function ThemeToggle({ className }: { className?: string }) {
  const preference = useThemePreference();
  const isDark = preference === "dark";

  return (
    <button
      type="button"
      onClick={() => setThemePreference(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "civic-press flex size-11 shrink-0 items-center justify-center rounded-full border border-border-light bg-card text-portal-ink-2 outline-none hover:bg-primary-tint focus-visible:ring-[3px] focus-visible:ring-ring/50 md:size-12.5",
        className,
      )}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
