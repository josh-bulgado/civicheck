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
    <Card className="divide-y divide-border" size="sm">
      <CardHeader className="space-y-3">
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
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {displayName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Service Code: {service.service_code}
            </p>
            
            {/* Inline fee and processing summary */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5">
                <CircleDollarSign className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{formatFee(service.fee)}</span>
              </span>
              <span aria-hidden className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                <span className="font-semibold text-foreground">{service.processing_time || "N/A"}</span>
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* ── Process Steps ──────────────────────────────────────────────── */}
      {cleanedSteps.length > 0 && (
        <CardContent className="py-4">
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
            <CollapsibleTrigger className="flex items-center justify-between w-full cursor-pointer group/trigger select-none">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                How It Works
              </h3>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-1">
              <div className="relative ml-1.5 space-y-0">
                {cleanedSteps.map((step, idx) => (
                  <div key={idx} className="relative flex gap-3 pb-3 last:pb-0">
                    {/* Timeline connector */}
                    {idx < cleanedSteps.length - 1 && (
                      <div className="absolute left-[9px] top-5 bottom-0 w-[1px] bg-border" />
                    )}
                    {/* Step number */}
                    <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    {/* Step text */}
                    <p className="text-xs text-foreground leading-relaxed pt-0.5">
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
