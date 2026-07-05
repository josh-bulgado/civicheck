import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, FileText, PhilippinePeso } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { formatFee } from "~/features/services/service-utils";

export interface ServiceProps {
  service_code: string;
  name: string;
  classification: string;
  fee: number | string;
  processing_time: string;
  display_group: string | null;
  display_name: string | null;
}

const ServiceCard = (service: ServiceProps) => {
  const variant = service.classification as
    | "simple"
    | "complex"
    | "highly_technical";
  const label = service.classification.replace("_", " ");

  return (
    <Card className="group">
      <CardHeader className="gap-4 ">
        <div className="flex items-start justify-between gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "var(--svc-primary-soft)", color: "var(--svc-primary)" }}
          >
            <FileText className="w-5 h-5" />
          </div>

          <Badge variant={variant} className="capitalize">
            {label}
          </Badge>
        </div>
        <CardTitle className="font-bold">
          {service.display_name ?? service.name}
        </CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="flex flex-col gap-2 grow">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0" style={{ color: "var(--svc-primary-muted)" }} />
          <span>
            Processing: <strong>{service.processing_time}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 ">
          <PhilippinePeso size={16} className="shrink-0" style={{ color: "var(--svc-primary-muted)" }} />
          <span>
            Service Fee:{" "}
            <strong>
              {formatFee(service.fee, service.display_group)}
            </strong>
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <CardAction className="w-full">
          <Link
            to="/service/$serviceCode"
            params={{ serviceCode: service.display_group ?? service.service_code }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors bg-gray-50 text-gray-700 group-hover:text-white"
            style={{
              // Use CSS custom properties for hover — the group-hover class handles text color,
              // we apply background via the hover pseudo-class below
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--svc-cta)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "";
            }}
          >
            View Requirements
            <ArrowRight className="w-4 h-4" />
          </Link>
        </CardAction>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;
