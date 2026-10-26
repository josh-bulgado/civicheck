import { useState } from "react";
import { QrCode } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeaderCard } from "~/components/ui/page-header-card";
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
    <PageHeaderCard
      title="Request Queue"
      description={`${departmentName ? `${departmentName} department` : "CCRO Administration"}, ${requestCount} ${
        requestCount === 1 ? "request" : "requests"
      }, ${waitingCount} waiting on staff`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="lg"
          shape="pill"
          onClick={() => setScannerOpen(true)}
        >
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
    </PageHeaderCard>
  );
}
