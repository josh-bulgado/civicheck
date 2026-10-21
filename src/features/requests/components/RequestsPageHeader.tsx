import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "~/components/ui/button";
import { QrScannerDialog } from "./QrScannerDialog";
import { WalkInIntakeDialog } from "./WalkInIntakeDialog";
import type { EncodableService } from "../walk-in-intake.queries";

interface RequestsPageHeaderProps {
  /** Set when the viewer is department-scoped (staff/supervisor). */
  departmentName?: string | null;
  requestCount: number;
  /** Requests whose next move is staff's. */
  waitingCount: number;
  /** Set when the viewer can encode walk-ins; null/undefined hides the action. */
  encodableServices?: EncodableService[] | null;
  onWalkInEncoded?: () => void;
  /** A scanned tracking number, to put in the search box. */
  onScan: (trackingNumber: string) => void;
}

export function RequestsPageHeader({
  departmentName,
  requestCount,
  waitingCount,
  encodableServices,
  onWalkInEncoded,
  onScan,
}: RequestsPageHeaderProps) {
  const [scannerOpen, setScannerOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-border-strong bg-card px-5 py-4">
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight text-foreground">
          Request Queue
        </h1>
        <p className="text-sm text-muted-foreground">
          {departmentName ? `${departmentName} department` : "CCRO Administration"},{" "}
          {requestCount} {requestCount === 1 ? "request" : "requests"},{" "}
          {waitingCount} waiting on staff
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="lg" onClick={() => setScannerOpen(true)}>
          <QrCode aria-hidden="true" data-icon="inline-start" />
          Scan Tracking QR
        </Button>
        {encodableServices ? (
          <WalkInIntakeDialog
            services={encodableServices}
            onChanged={() => onWalkInEncoded?.()}
          />
        ) : null}
      </div>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDecode={onScan}
      />
    </header>
  );
}
