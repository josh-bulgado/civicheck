import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { RoutePendingSkeleton } from "~/components/feedback/RoutePendingSkeleton";

export function SubmittedRequestRedirect({ requestId }: { requestId: string }) {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({
      to: "/my-requests/$requestId",
      params: { requestId },
      replace: true,
    });
  }, [navigate, requestId]);

  return <RoutePendingSkeleton />;
}
