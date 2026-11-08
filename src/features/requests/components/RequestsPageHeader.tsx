import { lazy, Suspense, useState } from "react";
import { Plus, QrCode } from "lucide-react";
import { Button } from "~/components/ui/button";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import type { EncodableService } from "../walk-in-intake.queries";

const loadQrScannerDialog = () =>
  import("./QrScannerDialog").then(({ QrScannerDialog }) => ({
    default: QrScannerDialog,
  }));
const loadWalkInIntakeDialog = () =>
  import("./WalkInIntakeDialog").then(({ WalkInIntakeDialog }) => ({
    default: WalkInIntakeDialog,
  }));

const LazyQrScannerDialog = lazy(loadQrScannerDialog);
const LazyWalkInIntakeDialog = lazy(loadWalkInIntakeDialog);

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
  const [walkInOpen, setWalkInOpen] = useState(false);

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
          onPointerEnter={() => void loadQrScannerDialog()}
          onFocus={() => void loadQrScannerDialog()}
        >
          <QrCode aria-hidden="true" data-icon="inline-start" />
          Scan Tracking QR
        </Button>
        {encodableServices ? (
          <Button
            type="button"
            shape="pill"
            size="lg"
            disabled={encodableServices.length === 0}
            onClick={() => setWalkInOpen(true)}
            onPointerEnter={() => void loadWalkInIntakeDialog()}
            onFocus={() => void loadWalkInIntakeDialog()}
          >
            <Plus aria-hidden="true" data-icon="inline-start" />
            Encode Walk-in
          </Button>
        ) : null}
      </div>

      {scannerOpen ? (
        <Suspense fallback={null}>
          <LazyQrScannerDialog
            open
            onOpenChange={setScannerOpen}
            onDecode={onScan}
          />
        </Suspense>
      ) : null}
      {walkInOpen && encodableServices ? (
        <Suspense fallback={null}>
          <LazyWalkInIntakeDialog
            services={encodableServices}
            onChanged={() => onWalkInEncoded?.()}
            open
            onOpenChange={setWalkInOpen}
            showTrigger={false}
          />
        </Suspense>
      ) : null}
    </PageHeaderCard>
  );
}
