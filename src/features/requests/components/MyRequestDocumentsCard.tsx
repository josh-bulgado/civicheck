import { useRef, useState } from "react";
import { PreviousUploads } from "./PreviousUploads";
import type { PreviousUpload } from "../previous-uploads";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Upload, XCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  prepareUploadFile,
  uploadTypeOf,
} from "~/features/apply/upload-image.utils";
import {
  addMissingAttachmentFn,
  getMyAttachmentSignedUrlFn,
  resubmitOwnAttachmentFn,
} from "~/features/requests/applicant-requests.mutations";
import type { AddableUpload } from "~/features/requests/missing-uploads";
import { requirementUploadKey } from "~/features/services/requirement-upload.utils";
import { describeRequirement } from "~/features/services/requirement-display";
import { AttachmentGroups } from "~/features/requests/components/AttachmentGroups";
import { AttachmentThumbnail } from "~/features/requests/components/AttachmentThumbnail";
import { AttachmentViewerDialog } from "~/features/requests/components/AttachmentViewerDialog";
import { partitionDocumentsForReupload } from "~/features/requests/document-attention";
import { cn } from "~/lib/utils";

const ACCEPT = "image/jpeg,image/png,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024;

/** The file ready to send, or null once the applicant has been told why not. */
async function prepareOrExplain(file: File): Promise<File | null> {
  if (!ACCEPT.split(",").includes(uploadTypeOf(file))) {
    toast.error("Only JPG, PNG, or PDF files are accepted.");
    return null;
  }
  const preparedFile = await prepareUploadFile(file);
  if (preparedFile.size > MAX_SIZE) {
    toast.error("Files must be 10 MB or smaller.");
    return null;
  }
  return preparedFile;
}

type AttachmentDoc = {
  id: string;
  requirementName: string;
  subjectRole: string | null;
  verificationStatus: string;
  rejectionReason: string | null;
  previousUploads?: PreviousUpload[];
};

/**
 * Uploaded files in compact rows, with review status, previews, and the
 * existing replacement flow for documents staff sent back.
 */
export function MyRequestDocumentsCard({
  requestId,
  documents,
  addable,
  closed,
  onChanged,
}: {
  requestId: string;
  documents: AttachmentDoc[];
  /** Checklist documents not uploaded yet; non-empty only while the request is incomplete. */
  addable: AddableUpload[];
  /** Released or rejected: the documents are part of the record and can't be replaced. */
  closed: boolean;
  /** Called after an upload lands, so the route can re-run its loader. */
  onChanged: () => void;
}) {
  const allApproved =
    documents.length > 0 && documents.every((doc) => doc.verificationStatus === "approved") && !addable.some((slot) => slot.isMandatory);
  const { needsReupload, uploaded } = partitionDocumentsForReupload(documents, closed);
  const missingRequired = addable.filter((slot) => slot.isMandatory).length;
  const renderAttachment = (doc: AttachmentDoc, title?: string) => (
    <AttachmentRow key={doc.id} doc={doc} title={title} canResubmit={!closed} onChanged={onChanged} />
  );

  return (
    <section
      aria-labelledby="request-documents-heading"
      className="min-w-0 rounded-3xl border border-border-light bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2
          id="request-documents-heading"
          className="text-[22px] leading-[normal] font-semibold text-foreground"
        >
          Documents ({documents.length})
        </h2>
        {allApproved && (
          <Badge variant="success" className="h-7 px-3">
            All approved
          </Badge>
        )}
        {needsReupload.length > 0 && (
          <Badge variant="destructive" className="h-7 px-3">
            {needsReupload.length} {needsReupload.length === 1 ? "needs" : "need"} re-upload
          </Badge>
        )}
        {missingRequired > 0 && <Badge variant="warning" className="h-7 px-3">{missingRequired} missing</Badge>}
      </div>

      {needsReupload.length > 0 && (
        <section aria-labelledby="documents-reupload-heading" className="mt-4 flex flex-col gap-3">
          <h3 id="documents-reupload-heading" className="text-sm font-semibold text-destructive">Needs re-upload</h3>
          <AttachmentGroups docs={needsReupload} numberingDocs={documents} renderRow={renderAttachment} />
        </section>
      )}

      {addable.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border-light p-4">
          <h3 className="text-[17px] leading-snug font-semibold text-foreground">
            Add a missing document
          </h3>
          <p className="mt-1 text-[15px] leading-[1.45] text-muted-foreground">
            If staff asked for a document you didn’t upload, add it here. You
            don’t need to visit the CCRO for it.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {addable.map((slot) => (
              <AddDocumentRow
                key={requirementUploadKey(slot.requirementId, slot.subjectRole)}
                requestId={requestId}
                slot={slot}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && (
        <p className="mt-4 text-[15px] text-muted-foreground italic">Nothing was pre-uploaded for this request.</p>
      )}
      {uploaded.length > 0 && (
        <div className={cn("mt-4 flex flex-col gap-2", (needsReupload.length > 0 || addable.length > 0) && "border-t border-border-lighter pt-4")}>
          {needsReupload.length > 0 && <h3 className="mb-1 text-sm font-semibold text-foreground">Other uploaded documents</h3>}
          <AttachmentGroups docs={uploaded} numberingDocs={documents} renderRow={renderAttachment} />
        </div>
      )}
    </section>
  );
}

function AddDocumentRow({
  requestId,
  slot,
  onChanged,
}: {
  requestId: string;
  slot: AddableUpload;
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const display = describeRequirement(slot.requirementName);

  async function handleFile(file: File) {
    setSubmitting(true);
    try {
      const preparedFile = await prepareOrExplain(file);
      if (!preparedFile) return;

      const formData = new FormData();
      formData.set("file", preparedFile);
      formData.set("requestId", requestId);
      formData.set("requirementId", slot.requirementId);
      if (slot.subjectRole) formData.set("subjectRole", slot.subjectRole);

      const res = await addMissingAttachmentFn({ data: formData });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success("Document added for review.");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-upload-required={slot.isMandatory || undefined} className={cn("flex flex-col gap-3 rounded-2xl border border-border-lighter p-4 sm:flex-row sm:items-center", slot.isMandatory && "border-destructive/35 bg-portal-danger-soft/30")}>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-semibold text-foreground">
          {slot.subjectRole ? `${slot.subjectRole}: ` : ""}{display.title}
        </p>
        {display.detail && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{display.detail}</p>}
        {!slot.isMandatory && <Badge variant="neutral" className="mt-2">Optional</Badge>}
      </div>
      <Input
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
        variant="outline"
        className="h-12 shrink-0 rounded-full px-5 text-base font-semibold"
        disabled={submitting}
        onClick={() => fileInput.current?.click()}
      >
        <Upload data-icon="inline-start" />
        {submitting ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
}

function AttachmentRow({
  doc,
  title,
  canResubmit,
  onChanged,
}: {
  doc: AttachmentDoc;
  /** Overrides the requirement name, e.g. "File 2 of 3" inside a group. */
  title?: string;
  canResubmit: boolean;
  onChanged: () => void;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const rejected = doc.verificationStatus === "rejected";
  const pending = !rejected && doc.verificationStatus !== "approved";
  const needsReupload = rejected && canResubmit;
  const display = describeRequirement(doc.requirementName);

  async function handleViewFile(knownUrl?: string) {
    // The thumbnail already holds a fresh link, and the file behind it is in the
    // cache: open straight away instead of signing another.
    if (knownUrl) {
      setViewerUrl(knownUrl);
      return;
    }
    setViewing(true);
    try {
      const res = await getMyAttachmentSignedUrlFn({
        data: { attachmentId: doc.id },
      });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      setViewerUrl(res.url);
    } finally {
      setViewing(false);
    }
  }

  async function handleFile(file: File) {
    setSubmitting(true);
    try {
      const preparedFile = await prepareOrExplain(file);
      if (!preparedFile) return;

      const formData = new FormData();
      formData.set("file", preparedFile);
      formData.set("attachmentId", doc.id);

      const res = await resubmitOwnAttachmentFn({ data: formData });
      if (res.error) {
        toast.error(res.message);
        return;
      }
      toast.success("Document resubmitted for review.");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div data-reupload-required={needsReupload || undefined} className={cn("flex min-w-0 flex-col gap-3 rounded-2xl border border-border-lighter p-3", needsReupload && "border-destructive/40 bg-portal-danger-soft/40 ring-1 ring-destructive/10")}>
      <div className="flex min-w-0 items-start gap-3">
        <AttachmentThumbnail
          attachmentId={doc.id}
          version={doc.verificationStatus}
          label={`${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`}
          busy={viewing}
          onOpen={handleViewFile}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <button type="button" disabled={viewing} onClick={() => handleViewFile()}
            className="min-h-11 min-w-0 cursor-pointer rounded-md text-left text-sm leading-snug font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-70"
            aria-label={`View ${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`}>
            <span className="block">{title ?? `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${display.title}`}</span>
            {!title && display.detail && (
              <span className="mt-1 block text-xs leading-relaxed font-normal text-muted-foreground">{display.detail}</span>
            )}
          </button>
          {pending && (
            <Badge variant="warning" className="h-7 gap-1.5 px-2.5">
              <Clock3 aria-hidden="true" /> Pending review
            </Badge>
          )}
          {!pending && !rejected && (
            <Badge variant="success" className="h-7 gap-1.5 px-2.5"><CheckCircle2 aria-hidden="true" /> Approved</Badge>
          )}
          {rejected && (
            <Badge variant="destructive" className="h-7 gap-1.5 px-2.5"><XCircle aria-hidden="true" /> {needsReupload ? "Re-upload required" : "Rejected"}</Badge>
          )}
        </div>
      </div>

      {rejected && doc.rejectionReason && (
        <p className="text-sm leading-snug text-destructive"><span className="font-semibold">Staff feedback: </span>{doc.rejectionReason}</p>
      )}

      {rejected && canResubmit && (
        <>
          <Input
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
            className="h-12 w-full rounded-full text-base font-semibold"
            disabled={submitting}
            onClick={() => fileInput.current?.click()}
          >
            <Upload data-icon="inline-start" />
            {submitting ? "Uploading..." : "Re-upload document"}
          </Button>
        </>
      )}

      <PreviousUploads attachmentId={doc.id} uploads={doc.previousUploads ?? []} applicant />
      <AttachmentViewerDialog
        url={viewerUrl}
        subjectRole={doc.subjectRole}
        requirementName={doc.requirementName}
        onClose={() => setViewerUrl(null)}
      />
    </div>
  );
}
