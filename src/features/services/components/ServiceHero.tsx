import { useState } from "react";
import { Clock, CircleDollarSign, ArrowRight, ChevronDown } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "~/components/ui/collapsible";
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
  const [isOpen, setIsOpen] = useState(true);

  // Clean step text: remove editorial caveats, filter out empty results
  const cleanedSteps = (service.steps_description ?? [])
    .map(cleanStepText)
    .filter((s) => s.length > 0);

  return (
    <Card className="overflow-hidden border-primary-hover bg-primary text-white shadow-[0_14px_32px_rgba(0,59,134,0.16)]" size="sm">
      <CardHeader className="space-y-4 px-5 py-6 sm:px-7">
        {/* Title row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {service.classification && (
                <Badge
                  variant={service.classification as any}
                  className="capitalize"
                >
                  {service.classification.replace("_", " ")}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-white sm:text-3xl">
              {displayName}
            </h1>
            <p className="text-xs font-medium text-white/65">
              Service Code: {service.service_code}
            </p>
            
            {/* Inline fee and processing summary */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-white/70">
              <span className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <CircleDollarSign className="size-4 text-brand-gold" />
                <span className="font-bold text-white">{formatFee(service.fee)}</span>
              </span>
              <span className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2">
                <Clock className="size-4 text-brand-gold" />
                <span className="font-bold text-white">{service.processing_time || "N/A"}</span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* ── Process Steps ──────────────────────────────────────────────── */}
      {cleanedSteps.length > 0 && (
        <CardContent className="border-t border-white/15 bg-primary-hover/35 px-5 py-5 sm:px-7">
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full cursor-pointer group/trigger select-none">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/75">
                <ArrowRight className="h-3.5 w-3.5 text-brand-gold" />
                How It Works
              </h3>
              <ChevronDown className={`h-4 w-4 text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-1">
              <div className="relative ml-1.5 space-y-0">
                {cleanedSteps.map((step, idx) => (
                  <div key={idx} className="relative flex gap-3 pb-3 last:pb-0">
                    {/* Timeline connector */}
                    {idx < cleanedSteps.length - 1 && (
                      <div className="absolute bottom-0 left-[9px] top-5 w-px bg-white/20" />
                    )}
                    {/* Step number */}
                    <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-gold text-[10px] font-extrabold text-foreground">
                      {idx + 1}
                    </div>
                    {/* Step text */}
                    <p className="pt-0.5 text-xs leading-relaxed text-white/85">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      )}
    </Card>
  );
}
