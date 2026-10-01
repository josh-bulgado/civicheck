import type { CSSProperties, ReactNode } from "react";
import { Badge } from "~/components/ui/badge";
import { staggerStyle } from "~/components/motion/stagger";
import {
  STAGE_LABELS,
  getPaymentDetails,
  getStatusDetails,
  stageOf,
} from "~/features/requests/request-workflow";

// The status badges are pale tints made for white cards; on the solid-blue hero
// they read washed out. Here the chip is a translucent white pill and the
// variant's meaning is carried by a bright dot instead.
const HERO_DOT: Record<string, string> = {
  success: "bg-success-dot",
  warning: "bg-brand-gold",
  destructive: "bg-red-300",
  info: "bg-sky-300",
  neutral: "bg-white/60",
};

function HeroBadge({
  variant,
  style,
  children,
}: {
  variant: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <Badge
      variant="outline"
      style={style}
      className="h-6 gap-1.5 border-white/25 bg-white/10 px-2.5 text-white backdrop-blur-sm"
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${HERO_DOT[variant] ?? HERO_DOT.neutral}`}
      />
      {children}
    </Badge>
  );
}

/**
 * The dark hero at the top of a request page (applicant and staff): stage
 * eyebrow, tracking number, a subtitle line, status/payment badges, and any
 * page-specific actions as `children`.
 */
export function RequestDetailHero({
  trackingNumber,
  status: statusCode,
  paymentStatus,
  feesDue,
  subtitle,
  children,
}: {
  trackingNumber: string;
  status: string;
  paymentStatus: string;
  feesDue: number;
  subtitle: ReactNode;
  children?: ReactNode;
}) {
  const status = getStatusDetails(statusCode);
  const payment = getPaymentDetails(paymentStatus, feesDue);
  const stage = stageOf(statusCode);

  return (
    <header className="dashboard-hero">
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.13em] text-brand-gold">
            {stage ? `Stage ${stage} · ${STAGE_LABELS[stage]}` : "Unknown stage"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
            {trackingNumber}
          </h1>
          <p className="mt-2 text-sm text-white/75">{subtitle}</p>
        </div>
        <div className="civic-stagger flex flex-wrap items-center gap-2">
          <HeroBadge variant={status.variant} style={staggerStyle(0)}>
            {status.label}
          </HeroBadge>
          <HeroBadge variant={payment.variant} style={staggerStyle(1)}>
            {payment.label}
          </HeroBadge>
          {children}
        </div>
      </div>
    </header>
  );
}
