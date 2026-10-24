import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Kbd } from "~/components/ui/kbd";
import { postureContent } from "../security-center.utils";
import { countLabel } from "../system-health.utils";
import type { SecurityGlance, SecurityPosture } from "../system-admin.types";

const postureBadge: Record<SecurityPosture, "success" | "warning" | "destructive"> = {
  protected: "success",
  watch: "warning",
  attention: "destructive",
};

/** One line from Security Center, so a problem there is seen on the page the admin lands on. */
export function SecurityPostureCard({
  security,
  hotkeyLabel,
}: {
  security: SecurityGlance;
  hotkeyLabel: (hotkey: string) => string;
}) {
  return (
    <Card variant="quiet" size="sm" className="gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle>
          <h2 className="text-lg font-bold">Security Posture</h2>
        </CardTitle>
        <CardDescription>
          {countLabel(security.openFindingCount, "open finding")} · {countLabel(security.overdueControlCount, "policy review")} due
        </CardDescription>
        <CardAction>
          <Badge variant={postureBadge[security.posture]}>{postureContent[security.posture].label}</Badge>
        </CardAction>
      </CardHeader>
      <Link
        to="/system-admin/security"
        className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-sm font-semibold text-primary outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="inline-flex items-center gap-2">
          <ArrowUpRight className="size-4" aria-hidden="true" />
          Open Security Center
        </span>
        <Kbd aria-hidden="true">{hotkeyLabel("S")}</Kbd>
      </Link>
    </Card>
  );
}
