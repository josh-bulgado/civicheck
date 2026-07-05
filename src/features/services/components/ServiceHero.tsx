import { Clock, CircleDollarSign, ArrowRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { cleanStepText, formatFee } from "~/features/services/service-utils";

interface Service {
  name: string;
  service_code: string;
  classification: string | null;
  fee: number | string;
  processing_time: string;
  steps_description: string[] | null;
  display_name: string | null;
}

interface ServiceHeroProps {
  service: Service;
  displayName: string;
}

export function ServiceHero({ service, displayName }: ServiceHeroProps) {
  // Clean step text: remove editorial caveats, filter out empty results
  const cleanedSteps = (service.steps_description ?? [])
    .map(cleanStepText)
    .filter((s) => s.length > 0);

  return (
    <Card>
      <CardHeader className="space-y-5">
        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--svc-text-primary)" }}>
              {displayName}
            </h1>
            <p className="text-xs font-medium" style={{ color: "var(--svc-text-muted)" }}>
              Service Code: {service.service_code}
            </p>
          </div>
          {service.classification && (
            <Badge
              variant={service.classification as any}
            >
              {service.classification.replace("_", " ")}
            </Badge>
          )}
        </div>

        <Separator />

        {/* ── Key Metrics: Fee & Processing Time ─────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fee Card */}
          <div
            className="relative flex items-center gap-4 rounded-xl p-4 border-l-4 transition-shadow hover:shadow-sm"
            style={{
              background: "var(--svc-primary-soft)",
              borderLeftColor: "var(--svc-primary)",
              borderTop: "1px solid var(--svc-primary-border)",
              borderRight: "1px solid var(--svc-primary-border)",
              borderBottom: "1px solid var(--svc-primary-border)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--svc-primary)", color: "#fff" }}
            >
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--svc-text-secondary)" }}>
                Standard Fee
              </p>
              <p
                className="text-xl font-bold leading-tight"
                style={{
                  fontFamily: "var(--svc-font-display)",
                  color: "var(--svc-text-primary)",
                }}
              >
                {formatFee(service.fee)}
              </p>
            </div>
          </div>

          {/* Processing Time Card */}
          <div
            className="relative flex items-center gap-4 rounded-xl p-4 border-l-4 transition-shadow hover:shadow-sm"
            style={{
              background: "var(--svc-primary-soft)",
              borderLeftColor: "var(--svc-primary)",
              borderTop: "1px solid var(--svc-primary-border)",
              borderRight: "1px solid var(--svc-primary-border)",
              borderBottom: "1px solid var(--svc-primary-border)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ background: "var(--svc-primary)", color: "#fff" }}
            >
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "var(--svc-text-secondary)" }}>
                Processing Time
              </p>
              <p
                className="text-xl font-bold leading-tight"
                style={{
                  fontFamily: "var(--svc-font-display)",
                  color: "var(--svc-text-primary)",
                }}
              >
                {service.processing_time || "N/A"}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* ── Process Steps ──────────────────────────────────────────────── */}
      {cleanedSteps.length > 0 && (
        <CardContent className="space-y-4 pt-0">
          <Separator />
          <h3
            className="text-[11px] font-bold uppercase tracking-[0.08em] flex items-center gap-2"
            style={{ color: "var(--svc-primary)" }}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            How It Works ({cleanedSteps.length} steps)
          </h3>

          <div className="relative ml-2 space-y-0">
            {cleanedSteps.map((step, idx) => (
              <div key={idx} className="relative flex gap-4 pb-5 last:pb-0">
                {/* Timeline connector */}
                {idx < cleanedSteps.length - 1 && (
                  <div
                    className="absolute left-[13px] top-7 bottom-0 w-[2px]"
                    style={{ background: "var(--svc-primary-border)" }}
                  />
                )}
                {/* Step number */}
                <div
                  className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    background: "var(--svc-primary)",
                    color: "#fff",
                  }}
                >
                  {idx + 1}
                </div>
                {/* Step text */}
                <p
                  className="text-[13px] font-medium leading-relaxed pt-1"
                  style={{ color: "var(--svc-text-primary)" }}
                >
                  {step}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
