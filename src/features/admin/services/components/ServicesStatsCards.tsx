import { useMemo } from "react";
import { FileText, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Service } from "../services.types";

interface ServicesStatsCardsProps {
  data: Service[];
}

export function ServicesStatsCards({ data }: ServicesStatsCardsProps) {
  const stats = useMemo(() => ({
    total: data.length,
    simple: data.filter((s) => s.classification === "simple").length,
    complex: data.filter((s) => s.classification === "complex").length,
    highlyTechnical: data.filter((s) => s.classification === "highly_technical").length,
  }), [data]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-100 ring-indigo-100">
        <div className="absolute -right-6 -bottom-6 opacity-10 text-indigo-900 pointer-events-none">
          <FileText className="w-24 h-24" />
        </div>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">
            Total Registered Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-indigo-950 font-heading">{stats.total}</p>
          <CardDescription className="mt-1 text-indigo-600">
            Active services in the Legazpi CCRO system
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100 ring-emerald-100">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            Simple Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-950 font-heading">{stats.simple}</p>
          <CardDescription className="mt-1 text-emerald-600">
            Fast turnaround (typically 1–2 hours)
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100 ring-amber-100">
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
            Complex Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-amber-950 font-heading">{stats.complex}</p>
          <CardDescription className="mt-1 text-amber-600">
            Requires posting/verification periods
          </CardDescription>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-100 ring-rose-100">
        <div className="absolute -right-6 -bottom-6 opacity-10 text-rose-900 pointer-events-none">
          <Settings className="w-24 h-24" />
        </div>
        <CardHeader>
          <CardTitle className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
            Highly Technical / Other
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-rose-950 font-heading">{stats.highlyTechnical}</p>
          <CardDescription className="mt-1 text-rose-600">
            Requires court decree or custom reviews
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
