import { Clock, CircleDollarSign, HelpCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";

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

const classificationStyles: Record<string, string> = {
  simple: "bg-emerald-50 text-emerald-700 border-emerald-200",
  complex: "bg-amber-50 text-amber-700 border-amber-200",
  highly_technical: "bg-rose-50 text-rose-700 border-rose-200",
};

export function ServiceHero({ service, displayName }: ServiceHeroProps) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {displayName}
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Service Code: {service.service_code}
            </p>
          </div>
          {service.classification && (
            <Badge
              variant={service.classification as any}
              className={classificationStyles[service.classification]}
            >
              {service.classification.replace("_", " ")}
            </Badge>
          )}
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Estimated Processing Time</p>
              <p className="font-semibold text-gray-900">{service.processing_time}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <CircleDollarSign className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Service Fee</p>
              <p className="font-semibold text-gray-900">
                {Number(service.fee) === 0
                  ? "Free"
                  : `₱${Number(service.fee).toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      {service.steps_description && service.steps_description.length > 0 && (
        <CardContent className="space-y-3 pt-0">
          <Separator />
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-[#1a4480]" />
            Official Processing Steps
          </h3>
          <ol className="space-y-2 text-sm text-gray-600 pl-1">
            {service.steps_description.map((step, idx) => (
              <li key={idx} className="leading-relaxed">
                <span className="text-gray-900 font-medium">{idx + 1}. </span>
                {step}
              </li>
            ))}
          </ol>
        </CardContent>
      )}
    </Card>
  );
}
