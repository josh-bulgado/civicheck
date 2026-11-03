import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "~/components/ui/switch";
import { useTheme } from "~/hooks/use-theme";
import { cn } from "~/lib/utils";

/**
 * The light/dark switch for the signed-in headers. The sun and moon ride on the
 * thumb (sun when light, moon when dark). Touch size throughout: its 46x28 track
 * plus the Switch's built-in hit area comes to a 44px-high target on phones.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The server renders the switch "off"; on a dark page it flips to "on" right
  // after hydration. Keep it still until then so it doesn't visibly slide.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(true), 150);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <Switch
      size="touch"
      aria-label="Dark mode"
      checked={theme === "dark"}
      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      className={cn(
        // The track is 28px with a 1px border each side; this stretches the hit
        // area to the full 44px a phone needs (the Switch default gives 42), and keeps it clear of the neighbouring bell.
        "after:-inset-x-2 after:-inset-y-[9px] motion-reduce:transition-none [&_[data-slot=switch-thumb]]:motion-reduce:transition-none",
        !settled && "transition-none [&_[data-slot=switch-thumb]]:transition-none [&_svg]:transition-none",
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        className="pointer-events-none absolute left-[6px] top-1/2 size-3.5 -translate-y-1/2 text-warning transition-opacity group-data-checked/switch:opacity-0 motion-reduce:transition-none"
      />
      <Moon
        aria-hidden="true"
        className="pointer-events-none absolute left-[26px] top-1/2 size-3.5 -translate-y-1/2 text-primary opacity-0 transition-opacity group-data-checked/switch:opacity-100 motion-reduce:transition-none"
      />
    </Switch>
  );
}
