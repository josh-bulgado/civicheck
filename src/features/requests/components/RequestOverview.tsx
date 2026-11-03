import type { ReactNode } from "react";
import { Eye } from "lucide-react";
import { Button } from "~/components/ui/button";
import { StatusIcon } from "~/features/requests/components/DocumentsWorkbench";
import { STATUS_LABEL } from "~/features/requests/components/DocumentViewer";
import { SubmittedDetailsCard } from "~/features/requests/components/SubmittedDetailsCard";
import type { RequestDetail } from "~/features/requests/requests.queries";

type Attachment = RequestDetail["attachments"][number];

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function RequestSummary({ request }: { request: RequestDetail }) {
  const rows: [label: string, value: string][] = [
    ["Service", request.serviceName ?? "—"],
    ["Department", request.departmentName],
    ["Channel", request.isWalkIn ? "Walk-in, encoded by staff" : "Online"],
    ["Copies", String(request.copies)],
    ["Fee", request.feesDue > 0 ? `₱${request.feesDue.toFixed(2)}` : "No fee"],
  ];
  if (request.processingTime) rows.push(["Usual time", request.processingTime]);

  return (
    <section className="pb-5">
      <SectionTitle>Request</SectionTitle>
      <dl className="grid grid-cols-[minmax(7rem,38%)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DocumentsSummary({
  attachments,
  isWalkIn,
  onOpenDocument,
}: {
  attachments: Attachment[];
  isWalkIn: boolean;
  onOpenDocument: (id: string) => void;
}) {
  const accepted = attachments.filter((doc) => doc.verificationStatus === "approved").length;

  return (
    <section className="overflow-hidden rounded-xl border border-border-strong">
      <div className="flex items-center justify-between gap-2 border-b border-border-light px-4 py-3">
        <h3 className="text-sm font-bold text-foreground">Documents</h3>
        {attachments.length > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {accepted}/{attachments.length} accepted
          </span>
        )}
      </div>
      {attachments.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          {isWalkIn
            ? "Walk-in. Validate the physical documents at the counter."
            : "Nothing was uploaded. The originals are checked at release."}
        </p>
      ) : (
        <ul className="divide-y divide-border-light">
          {attachments.map((doc) => (
            <li key={doc.id}>
              <Button
                variant="ghost"
                className="h-auto w-full justify-start gap-3 rounded-none px-4 py-2.5 text-left font-normal"
                onClick={() => onOpenDocument(doc.id)}
                aria-label={`Open ${doc.requirementName}, ${STATUS_LABEL[doc.verificationStatus] ?? doc.verificationStatus}`}
              >
                <StatusIcon status={doc.verificationStatus} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {doc.requirementName}
                  </span>
                  {doc.subjectRole && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {doc.subjectRole}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {STATUS_LABEL[doc.verificationStatus] ?? doc.verificationStatus}
                </span>
                <Eye className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The staff request page's Overview tab: one card, what was asked for and what
 * the applicant answered on the left, the documents and the payment on the
 * right. Opening a document jumps to it in the Documents tab.
 */
export function RequestOverview({
  request,
  attachments,
  onOpenDocument,
  children,
}: {
  request: RequestDetail;
  /** The documents as the page shows them, with decisions still in their undo window. */
  attachments: Attachment[];
  onOpenDocument: (id: string) => void;
  /** Cards that sit under the documents, such as payment. */
  children?: ReactNode;
}) {
  return (
    <div className="dashboard-panel grid grid-cols-1 gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-8">
      <div className="min-w-0 divide-y divide-border-light">
        <RequestSummary request={request} />
        <div className="pt-5">
          <SubmittedDetailsCard request={request} showEmpty bare layout="rows" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <DocumentsSummary
          attachments={attachments}
          isWalkIn={request.isWalkIn}
          onOpenDocument={onOpenDocument}
        />
        {children}
      </div>
    </div>
  );
}
