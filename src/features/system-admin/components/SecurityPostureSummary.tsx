import { Check, Minus, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  postureBanner,
  postureMetrics,
  type PostureBanner,
  type PostureTone,
} from "../security-center.utils";
import type { SecurityCenterDashboard } from "../system-admin.types";

// Lucide has no bare "!" mark, so this one is drawn the way its stroke icons are.
function ExclamationMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v9" />
      <path d="M12 19h.01" />
    </svg>
  );
}

function MetricIcon({ tone }: { tone: PostureTone }) {
  if (tone === "ok") return <Check aria-hidden="true" />;
  if (tone === "neutral") return <Minus aria-hidden="true" />;
  return <ExclamationMark />;
}

export function SecurityPostureSummary({
  data,
  onReview,
}: {
  data: SecurityCenterDashboard;
  onReview: (tab: NonNullable<PostureBanner["action"]>["tab"]) => void;
}) {
  const banner = postureBanner(data);
  const metrics = postureMetrics(data);
  const { action } = banner;
  const Icon = data.posture === "protected" ? ShieldCheck : ShieldAlert;

  return (
    <section
      id="security-center-content"
      tabIndex={-1}
      className="security-posture"
      data-tone={banner.tone}
      aria-labelledby="security-posture-title"
    >
      <div className="security-posture-status">
        <span className="security-posture-icon">
          <Icon aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="security-posture-eyebrow">Current posture</p>
          <h2 id="security-posture-title" className="security-posture-title">
            {banner.label}
          </h2>
          <p className="security-posture-detail">{banner.detail}</p>
        </div>
      </div>
      <ul className="security-posture-metrics">
        {metrics.map((metric) => (
          <li key={metric.key} className="security-metric" data-tone={metric.tone}>
            <span className="security-metric-icon">
              <MetricIcon tone={metric.tone} />
            </span>
            <div className="min-w-0">
              <strong>{metric.title}</strong>
              <span>{metric.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      {action ? (
        <Button
          type="button"
          className="security-posture-action"
          onClick={() => onReview(action.tab)}
        >
          {action.label}
        </Button>
      ) : null}
    </section>
  );
}
