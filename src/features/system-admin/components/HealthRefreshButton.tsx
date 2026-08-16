import { useTransition } from "react";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

export function HealthRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className="border-white/25 bg-white/10 text-white shadow-none hover:bg-white/20 hover:text-white"
      disabled={isPending}
      aria-label="Refresh system health data"
      aria-busy={isPending}
      onClick={() => {
        startTransition(async () => {
          await router.invalidate({ sync: true });
        });
      }}
    >
      {isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <RefreshCw data-icon="inline-start" aria-hidden="true" />
      )}
      {isPending ? "Refreshing…" : "Refresh health"}
    </Button>
  );
}
