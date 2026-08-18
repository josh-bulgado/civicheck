import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Search, FileText, Upload } from "lucide-react";
import { enterDelay, staggerStyle } from "~/components/motion/stagger";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import SiteHeader from "~/features/landing/components/SiteHeader";
import SiteFooter from "~/features/landing/components/SiteFooter";
import { trackRequestFn, resubmitAttachmentFn } from "~/features/track/track.queries";
import { getStatusDetails, getPaymentDetails } from "~/features/services/request-status";
import { formatFee } from "~/features/services/service-utils";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024;

function getAttachmentStatusStyles(status: string) {
  switch (status) {
    case "approved":
      return "status-success";
    case "rejected":
      return "status-error";
    default:
      return "status-warning";
  }
}

type TrackSearch = { ref?: string };

export const Route = createFileRoute("/track")({
  component: TrackPage,
  validateSearch: (search: Record<string, unknown>): TrackSearch => ({
    ref: typeof search.ref === "string" ? search.ref : undefined,
  }),
});

const trackSchema = z.object({
  trackingNumber: z.string().min(1, "Enter your tracking number"),
  lastName: z.string().min(1, "Enter the last name on the request"),
});

type TrackValues = z.infer<typeof trackSchema>;

type TrackAttachment = {
  id: string;
  requirementName: string;
  verificationStatus: string;
  rejectionReason: string | null;
};

type TrackResult = {
  trackingNumber: string;
  serviceName: string;
  status: string | null;
  paymentStatus: string | null;
  feesDue: number | string;
  createdAt: string;
  attachments: TrackAttachment[];
};

function TrackPage() {
  const { ref } = Route.useSearch();
  const [result, setResult] = useState<TrackResult | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TrackValues>({
    resolver: zodResolver(trackSchema),
    mode: "onBlur",
    defaultValues: { trackingNumber: ref ?? "", lastName: "" },
  });

  async function onSubmit(values: TrackValues) {
    setSubmitting(true);
    setNotFound(null);
    try {
      const res = await trackRequestFn({ data: values });
      if (res.error || !res.request) {
        setNotFound(res.message || "We couldn't find that request.");
        setResult(null);
        return;
      }
      setResult(res.request);
    } finally {
      setSubmitting(false);
    }
  }

  async function refreshResult() {
    const values = form.getValues();
    const res = await trackRequestFn({ data: values });
    if (!res.error && res.request) setResult(res.request);
  }

  const status = result ? getStatusDetails(result.status) : null;
  const payment = result ? getPaymentDetails(result.paymentStatus) : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-160 flex-1 px-5 py-14 sm:px-8">
        <div className="civic-enter mb-8 text-center">
          <h1 className="civic-title text-[clamp(1.75rem,4vw,2.625rem)] leading-tight">
            Track an existing request
          </h1>
          <p className="mt-3.5 text-lg leading-relaxed text-body">
            Enter your tracking number and the last name on the request to
            check its status.
          </p>
        </div>

        <div
          className="civic-enter rounded-xl border border-border bg-white p-6 sm:p-8"
          style={enterDelay(90)}
        >
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={form.control}
                name="trackingNumber"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="trackingNumber">Tracking number</FieldLabel>
                    <Input
                      id="trackingNumber"
                      placeholder="e.g. CCRO-2026-000123"
                      autoCapitalize="characters"
                      {...field}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="lastName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="lastName">Last name on the request</FieldLabel>
                    <Input id="lastName" placeholder="e.g. Dela Cruz" {...field} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>

          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={submitting}
            className="civic-press mt-5 w-full sm:w-auto"
          >
            <Search
              className={`size-4 ${submitting ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {submitting ? "Searching..." : "Track request"}
          </Button>

          {notFound && (
            <p className="civic-enter-scale mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {notFound}
            </p>
          )}
        </div>

        {result && status && payment && (
          // Keyed on the tracking number so looking up a second request replays
          // the entrance instead of silently swapping the numbers in place.
          <div
            key={result.trackingNumber}
            className="civic-enter mt-6 rounded-xl border border-border bg-white p-6 sm:p-8"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="font-mono text-sm font-semibold text-muted-foreground">
                  {result.trackingNumber}
                </p>
                <p className="text-lg font-bold text-foreground">{result.serviceName}</p>
              </div>
            </div>

            <div className="civic-stagger-auto flex flex-col gap-3 divide-y divide-border-lighter text-sm">
              <div className="flex items-center justify-between pb-3">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${status.styles}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-muted-foreground">Payment</span>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${payment.styles}`}
                >
                  {payment.label}
                </span>
              </div>
              {Number(result.feesDue) > 0 && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-muted-foreground">Fees due</span>
                  <span className="font-bold text-foreground">
                    {formatFee(result.feesDue)} · pay at the CCRO cashier
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3">
                <span className="text-muted-foreground">Submitted</span>
                <span className="font-semibold text-foreground">
                  {new Date(result.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            {result.attachments.length > 0 && (
              <div className="mt-6 border-t border-border-lighter pt-5">
                <h2 className="mb-3 text-sm font-bold text-foreground">Your documents</h2>
                <div className="flex flex-col gap-3">
                  {result.attachments.map((doc) => (
                    <AttachmentTrackRow
                      key={doc.id}
                      doc={doc}
                      trackingNumber={result.trackingNumber}
                      lastName={form.getValues("lastName")}
                      onResubmitted={refreshResult}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function AttachmentTrackRow({
  doc,
  trackingNumber,
  lastName,
  onResubmitted,
}: {
  doc: TrackAttachment;
  trackingNumber: string;
  lastName: string;
  onResubmitted: () => Promise<void>;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleFile(file: File) {
    if (!file.type || !ACCEPT.split(",").includes(file.type)) {
      toast.error("Only JPG, PNG, or PDF files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Files must be 10 MB or smaller.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("attachmentId", doc.id);
      formData.set("trackingNumber", trackingNumber);
      formData.set("lastName", lastName);

      const res = await resubmitAttachmentFn({ data: formData });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success("Document resubmitted for review.");
      await onResubmitted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-light p-4 text-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{doc.requirementName}</p>
        <span
          className={`mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${getAttachmentStatusStyles(doc.verificationStatus)}`}
        >
          {doc.verificationStatus}
        </span>
        {doc.verificationStatus === "rejected" && doc.rejectionReason && (
          <p className="mt-1 text-xs text-destructive">{doc.rejectionReason}</p>
        )}
      </div>

      {doc.verificationStatus === "rejected" && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={submitting}
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="size-3.5" />
            {submitting ? "Uploading..." : "Resubmit"}
          </Button>
        </>
      )}
    </div>
  );
}
