import { Link } from "@tanstack/react-router";
import { cva } from "class-variance-authority";
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
          <div className="w-10 h-10 rounded-lg bg-[#1a4480]/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#1a4480]" />
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
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <span>
            Processing: <strong>{service.processing_time}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 ">
          <PhilippinePeso size={16} className="text-gray-400 shrink-0" />
          <span>
            Service Fee: {""}
            <strong>
              {service.display_group
                ? "Varies"
                : Number(service.fee) === 0
                  ? "Free"
                  : `₱${Number(service.fee).toFixed(2)}`}
            </strong>
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <CardAction className="w-full">
          <Link
            to="/service/$serviceCode"
            params={{ serviceCode: service.display_group ?? service.service_code }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#1a4480] hover:text-white transition-colors group-hover:bg-[#1a4480] group-hover:text-white"
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
