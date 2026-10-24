import { useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useHotkeys, type HotkeyChord } from "@tanstack/react-hotkeys";
import { CircleAlert, QrCode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button, buttonVariants } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { PageHeaderCard } from "~/components/ui/page-header-card";
import { formatPeso } from "~/lib/peso";
import { QrScannerDialog } from "~/features/requests/components/QrScannerDialog";
import type { PaymentHistoryRow } from "~/features/requests/requests.queries";
import { useHotkeyLabel } from "~/hooks/useHotkeyLabel";
import { stepTapeSelection, summarizeTape, tapeRows } from "../tape";
import { lookupYears, trackingYear } from "../tracking-input";
import { useCashierCounter, type CounterPorts } from "../useCashierCounter";
import { CounterKeyHints } from "./CounterKeyHints";
import { CounterSlip } from "./CounterSlip";
import { TodayTape } from "./TodayTape";
import { TrackingField } from "./TrackingField";
import { TrackingPicker } from "./TrackingPicker";

/** Focuses the tracking number, the same key the table searches use. */
const LOOKUP_HOTKEY: HotkeyChord = "/";

interface CashierCounterPageProps {
  /** A tracking number to open straight away, from a notification link. */
  initialTracking?: string;
  /** Today's verified payments, newest first. */
  payments: PaymentHistoryRow[];
  awaitingCount: number;
  /** Stand-ins for the server, for tests and previews. */
  ports?: CounterPorts;
}

export function CashierCounterPage({
  initialTracking,
  payments,
  awaitingCount,
  ports,
}: CashierCounterPageProps) {
  const router = useRouter();
  const navigate = useNavigate();
  const hotkeyLabel = useHotkeyLabel();

  const counter = useCashierCounter({
    initialTracking,
    ports,
    // The tape, the tally and the awaiting count all come from the route's loader.
    onVerified: () => void router.invalidate(),
  });
  const { result, choices, verified, recording, searching, missing } = counter;

  const [scannerOpen, setScannerOpen] = useState(false);
  const [tapeIndex, setTapeIndex] = useState(-1);
  const trackingRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const rows = tapeRows(payments);
  const { count, total } = summarizeTape(payments);

  function next() {
    counter.clear();
    setTapeIndex(-1);
    trackingRef.current?.focus();
  }

  function open(trackingNumber: string) {
    counter.open(trackingNumber);
    setTapeIndex(-1);
  }

  // With the field empty, the arrows walk the tape and Enter reopens the row.
  function onTrackingKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (counter.raw !== "") return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setTapeIndex((index) => stepTapeSelection(index, event.key === "ArrowDown" ? 1 : -1, rows.length));
    } else if (event.key === "Enter" && tapeIndex >= 0 && rows[tapeIndex]) {
      event.preventDefault();
      open(rows[tapeIndex].trackingNumber);
    }
  }

  // Plain keys are ignored while a field has focus; Esc and the modifier chord work everywhere.
  const enabled = !scannerOpen;
  useHotkeys(
    [
      { hotkey: LOOKUP_HOTKEY, callback: () => trackingRef.current?.focus() },
      { hotkey: "S", callback: () => setScannerOpen(true) },
      { hotkey: "R", callback: () => receiptRef.current?.focus() },
      { hotkey: "N", callback: next },
      { hotkey: "H", callback: () => void navigate({ to: "/payment-history", search: { from: undefined, to: undefined } }) },
      { hotkey: "Escape", callback: next },
      { hotkey: "Mod+Enter", callback: () => formRef.current?.requestSubmit() },
      ...(choices ?? []).slice(0, 2).map((choice, index) => ({
        hotkey: String(index + 1) as "1" | "2",
        callback: () => counter.pick(choice.id),
      })),
    ],
    { enabled, preventDefault: true },
  );

  const year = (result && trackingYear(result.trackingNumber)) ?? lookupYears()[0];
  const submitHint = hotkeyLabel("Mod+Enter");
  const escapeHint = hotkeyLabel("Escape");

  return (
    <div className="dashboard-page">
      <PageHeaderCard
        title="Cashier Counter"
        description={`${count} ${count === 1 ? "payment" : "payments"} verified today, ${formatPeso(total)} collected`}
      >
        <Link
          to="/payment-history"
          search={{ from: undefined, to: undefined }}
          className={buttonVariants({ variant: "ghost", size: "lg" })}
        >
          Payment History
          <Kbd aria-hidden="true">{hotkeyLabel("H")}</Kbd>
        </Link>
      </PageHeaderCard>

      <div className="grid items-start gap-6 lg:grid-cols-[21rem_minmax(0,1fr)]">
        <TodayTape
          payments={payments}
          awaitingCount={awaitingCount}
          selectedIndex={tapeIndex}
          onOpen={open}
          hints={{
            browse: `${hotkeyLabel("ArrowUp")} ${hotkeyLabel("ArrowDown")}`,
            reopen: hotkeyLabel("Enter"),
            history: hotkeyLabel("H"),
          }}
        />

        <div className="flex min-w-0 flex-col gap-6">
          <section
            aria-label="Look up a request"
            className="flex flex-wrap items-end gap-3 rounded-xl border border-border-strong bg-card p-5"
          >
            <TrackingField
              value={counter.raw}
              onChange={(value) => {
                counter.changeRaw(value);
                setTapeIndex(-1);
              }}
              onKeyDown={onTrackingKeyDown}
              inputRef={trackingRef}
              year={year}
              hotkeyLabel={hotkeyLabel(LOOKUP_HOTKEY)}
              busy={searching}
            />
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="h-16 rounded-xl px-5"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode aria-hidden="true" data-icon="inline-start" />
              Scan QR
              <Kbd aria-hidden="true">{hotkeyLabel("S")}</Kbd>
            </Button>
          </section>

          <div
            aria-live="polite"
            aria-busy={searching}
            className="flex min-w-0 flex-col gap-6 transition-opacity data-[searching=true]:opacity-60"
            data-searching={searching}
          >
            {missing ? (
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>No Request Matches {counter.raw.trim()}</AlertTitle>
                <AlertDescription>
                  Check the number with the applicant, or scan their QR instead.
                </AlertDescription>
              </Alert>
            ) : null}

            {choices ? <TrackingPicker choices={choices} onPick={counter.pick} /> : null}

            {result ? (
              <CounterSlip
                key={result.id}
                result={result}
                verified={verified}
                recording={recording}
                onRecord={(payment) => void counter.record(payment)}
                onNext={next}
                onClear={next}
                formRef={formRef}
                receiptRef={receiptRef}
                submitHint={submitHint}
                nextHint={hotkeyLabel("N")}
                clearHint={escapeHint}
              />
            ) : !choices ? (
              <div className="mx-auto w-full max-w-lg rounded-md border-2 border-dashed border-border-strong px-8 py-9 text-muted-foreground">
                <div className="flex flex-col gap-3.5" aria-hidden="true">
                  <span className="h-2.5 w-3/5 rounded-full bg-muted" />
                  <span className="h-2.5 w-5/6 rounded-full bg-muted" />
                  <span className="h-2.5 w-2/5 rounded-full bg-muted" />
                </div>
                <p className="mt-6 text-base text-foreground">
                  Type the last 6 digits, or scan the QR. The slip for that applicant appears here.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <CounterKeyHints
        hints={[
          { keys: hotkeyLabel(LOOKUP_HOTKEY), label: "Look Up" },
          { keys: hotkeyLabel("S"), label: "Scan QR" },
          { keys: hotkeyLabel("R"), label: "Receipt No." },
          { keys: submitHint, label: "Verify" },
          { keys: hotkeyLabel("N"), label: "Next Applicant" },
          { keys: escapeHint, label: "Clear" },
        ]}
      />

      <QrScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDecode={open} />
    </div>
  );
}
