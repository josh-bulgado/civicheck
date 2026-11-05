import { useEffect, useState } from "react";
import { LoaderCircle, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  claimRequestStageFn,
  releaseRequestStageFn,
} from "~/features/requests/requests.mutations";
import {
  REQUEST_CLAIM_RENEW_MS,
  isRequestClaimActive,
  type RequestClaim,
} from "~/features/requests/request-claims";

export function RequestClaimControl({
  requestId,
  status,
  claim,
  onUpdated,
}: {
  requestId: string;
  status: string;
  claim: RequestClaim | null;
  onUpdated: () => void | Promise<unknown>;
}) {
  const claimKey = `${requestId}:${status}`;
  const [busy, setBusy] = useState<"claiming" | "releasing" | null>(null);
  const [optimisticOwnership, setOptimisticOwnership] = useState<{
    key: string;
    mine: boolean;
  } | null>(null);
  const serverActive = isRequestClaimActive(claim, status);
  const serverMine = serverActive && claim.isMine;
  const optimisticMine = optimisticOwnership?.key === claimKey
    ? optimisticOwnership.mine
    : null;
  const active = optimisticMine ?? serverActive;
  const mine = optimisticMine ?? serverMine;

  // Keep the successful local state visible until the loader or Realtime
  // delivers the same ownership. This prevents the old button flashing back.
  useEffect(() => {
    setOptimisticOwnership((current) => {
      if (!current) return current;
      if (current.key !== claimKey) return null;
      if (current.mine ? serverMine : !serverMine) return null;
      return current;
    });
  }, [claimKey, serverMine]);

  useEffect(() => {
    if (!mine) return;
    let cancelled = false;

    async function renew() {
      if (document.hidden) return;
      const result = await claimRequestStageFn({ data: { requestId } });
      if (!cancelled && result.error) {
        setOptimisticOwnership(null);
        toast.error("Your handling lease ended", { description: result.message });
        await onUpdated();
      }
    }

    const timer = window.setInterval(() => void renew(), REQUEST_CLAIM_RENEW_MS);
    const onFocus = () => void renew();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [mine, onUpdated, requestId]);

  async function startHandling() {
    setBusy("claiming");
    try {
      const result = await claimRequestStageFn({ data: { requestId } });
      if (result.error) {
        toast.error("Could not claim this stage", { description: result.message });
        await onUpdated();
        return;
      }
      setOptimisticOwnership({ key: claimKey, mine: true });
      toast.success("You are now handling this stage");
      await onUpdated();
    } finally {
      setBusy(null);
    }
  }

  async function release() {
    setBusy("releasing");
    try {
      const result = await releaseRequestStageFn({ data: { requestId } });
      if (result.error) {
        toast.error("Could not release this stage", { description: result.message });
        await onUpdated();
        return;
      }
      setOptimisticOwnership({ key: claimKey, mine: false });
      await onUpdated();
    } finally {
      setBusy(null);
    }
  }

  if (mine) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="success">
          <UserCheck aria-hidden="true" /> You are handling this
        </Badge>
        <Button
          variant="ghost"
          size="xs"
          disabled={busy != null}
          aria-busy={busy === "releasing"}
          onClick={() => void release()}
        >
          {busy === "releasing" ? "Stopping…" : "Stop handling"}
        </Button>
      </div>
    );
  }

  if (active) {
    return <Badge variant="warning">{claim?.staffName ?? "Another staff member"} is handling this</Badge>;
  }

  return (
    <Button
      variant="outline"
      disabled={busy != null}
      aria-busy={busy === "claiming"}
      onClick={() => void startHandling()}
    >
      {busy === "claiming" ? (
        <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" />
      ) : (
        <UserCheck data-icon="inline-start" aria-hidden="true" />
      )}
      {busy === "claiming" ? "Claiming…" : "Start handling"}
    </Button>
  );
}
