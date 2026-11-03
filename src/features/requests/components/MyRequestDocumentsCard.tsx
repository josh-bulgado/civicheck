import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { AttachmentGroups } from "~/features/requests/components/AttachmentGroups";
import { AttachmentThumbnail } from "~/features/requests/components/AttachmentThumbnail";
import { AttachmentViewerDialog } from "~/features/requests/components/AttachmentViewerDialog";

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
};

/**
 * "Your documents": every file the applicant uploaded, with a way to look at
 * it, and to replace one that was sent back. An approved file says nothing
 * (the heading says so once, when they all are); only the ones still waiting
 * or sent back wear a badge.
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
    documents.length > 0 && documents.every((doc) => doc.verificationStatus === "approved");

  return (
    <section
      aria-labelledby="request-documents-heading"
      className="rounded-[28px] bg-card p-6 shadow-portal-card ring-2 ring-border-light md:p-7"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2
          id="request-documents-heading"
          className="text-[22px] leading-[normal] font-semibold text-foreground"
        >
          Your documents ({documents.length})
        </h2>
        {allApproved && (
          <span className="inline-flex h-7 items-center rounded-full bg-tone-success-soft px-3 text-[13px] font-semibold text-tone-success">
            All approved
          </span>
        )}
      </div>

      {documents.length === 0 ? (
        <p className="mt-4 text-[15px] text-muted-foreground italic">
          Nothing was pre-uploaded for this request.
        </p>
      ) : (
        <div className="civic-stagger-auto mt-4 flex flex-col gap-3">
          <AttachmentGroups
            docs={documents}
            renderRow={(doc, title) => (
              <AttachmentRow
                key={doc.id}
                doc={doc}
                title={title}
                canResubmit={!closed}
                onChanged={onChanged}
              />
            )}
          />
        </div>
      )}

      {addable.length > 0 && (
        <div className="mt-6 border-t border-border-lighter pt-5">
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
    <div className="flex flex-col gap-3 rounded-[20px] border border-border-lighter p-4 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 text-[17px] leading-snug font-semibold text-foreground">
        {slot.subjectRole ? `${slot.subjectRole}: ` : ""}
        {slot.requirementName}
      </p>
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
    <div className="flex flex-col gap-3.5 rounded-[20px] border border-border-lighter p-4">
      <div className="flex items-start gap-3.5">
        <AttachmentThumbnail
          attachmentId={doc.id}
          version={doc.verificationStatus}
          label={`${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`}
          busy={viewing}
          onOpen={handleViewFile}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug font-semibold text-foreground">
            {title ??
              `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`}
          </p>
          {pending && (
            <span className="mt-1.5 inline-flex h-7 items-center rounded-full bg-tone-warning-soft px-3 text-[13px] font-semibold text-tone-warning">
              Pending
            </span>
          )}
          {rejected && (
            <>
              <span className="mt-1.5 inline-flex h-7 items-center rounded-full bg-portal-danger-soft px-3 text-[13px] font-semibold text-destructive">
                Rejected
              </span>
              {doc.rejectionReason && (
                <p className="mt-1.5 text-sm leading-snug text-destructive">
                  {doc.rejectionReason}
                </p>
              )}
            </>
          )}
        </div>
      </div>

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
            {submitting ? "Uploading..." : "Resubmit"}
          </Button>
        </>
      )}

      <AttachmentViewerDialog
        url={viewerUrl}
        subjectRole={doc.subjectRole}
        requirementName={doc.requirementName}
        onClose={() => setViewerUrl(null)}
      />
    </div>
  );
}
