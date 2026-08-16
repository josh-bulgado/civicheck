import type { LucideIcon } from "lucide-react";
import {
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Siren,
  UserRoundCog,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { cn } from "~/lib/utils";
import { postureContent } from "../security-center.utils";
import type { SecurityCenterDashboard } from "../system-admin.types";

function LedgerMetric({
  icon: Icon,
  label,
  value,
  detail,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-36 min-w-0 flex-col justify-between gap-5 p-5 sm:p-6",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      <div>
        <p className="font-mono text-3xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function SecurityPostureSummary({
  data,
}: {
  data: SecurityCenterDashboard;
}) {
  const posture = postureContent[data.posture];

  return (
    <section
      id="security-center-content"
      tabIndex={-1}
      className="scroll-mt-6 rounded-xl focus-visible:ring-2 focus-visible:ring-ring"
      aria-labelledby="security-posture-title"
    >
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <CardTitle>
                <h2 id="security-posture-title" className="text-balance">
                  Security Posture Ledger
                </h2>
              </CardTitle>
              <CardDescription className="text-pretty">
                The latest access, authentication, policy, and finding signals.
              </CardDescription>
            </div>
            <Badge
              variant={
                data.posture === "attention"
                  ? "destructive"
                  : data.posture === "protected"
                    ? "secondary"
                    : "outline"
              }
            >
              <ShieldCheck data-icon="inline-start" aria-hidden="true" />
              {posture.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid p-0 sm:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div className="flex min-h-44 flex-col justify-between gap-8 border-b border-border p-5 sm:col-span-2 sm:p-6 xl:col-span-1 xl:border-r xl:border-b-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                Current Posture
              </p>
              <p className="mt-2 max-w-sm text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
                {posture.label}
              </p>
            </div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {posture.detail}
            </p>
          </div>
          <LedgerMetric
            icon={Siren}
            label="Urgent findings"
            value={data.urgentFindingCount}
            detail={`${data.openFindingCount} unresolved finding${data.openFindingCount === 1 ? "" : "s"} in total.`}
            className="border-b border-border sm:border-r xl:border-r xl:border-b-0"
          />
          <LedgerMetric
            icon={Fingerprint}
            label="Rejected sign-ins"
            value={data.failedSignIns24h}
            detail="Redacted password failures in the last 24 hours."
            className="border-b border-border xl:border-r xl:border-b-0"
          />
          <LedgerMetric
            icon={UserRoundCog}
            label="Privileged accounts"
            value={data.privilegedAccountCount}
            detail="System, CCRO, and supervisory assignments under review."
            className="border-b border-border sm:border-r sm:border-b-0 xl:border-r"
          />
          <LedgerMetric
            icon={KeyRound}
            label="Controls due"
            value={data.overdueControlCount}
            detail="Policy or credential reviews at or past their due date."
          />
        </CardContent>
      </Card>
    </section>
  );
}
