import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { getMyAttachmentSignedUrlFn } from "../applicant-requests.mutations";
import { getAttachmentSignedUrlFn } from "../requests.mutations";
import type { PreviousUpload } from "../previous-uploads";
import { AttachmentViewerDialog } from "./AttachmentViewerDialog";

export function PreviousUploads({
  attachmentId,
  uploads,
  applicant = false,
}: {
  attachmentId: string;
  uploads: PreviousUpload[];
  applicant?: boolean;
}) {
  const signOwn = useServerFn(getMyAttachmentSignedUrlFn);
  const signStaff = useServerFn(getAttachmentSignedUrlFn);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  if (!uploads.length) return null;

  async function view(previousIndex: number) {
    setBusy(true);
    try {
      const sign = applicant ? signOwn : signStaff;
      const result = await sign({ data: { attachmentId, previousIndex } });
      if (result.error) {
        toast.error(result.message);
        return;
      }
      setUrl(result.url);
    } catch {
      toast.error("Could not load this file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="shrink-0 border-t border-border-light p-3">
      <summary className="cursor-pointer text-sm font-semibold">
        Previous uploads ({uploads.length})
      </summary>
      <ul className="mt-2 max-h-48 space-y-3 overflow-y-auto">
        {uploads.map((upload, index) => (
          <li key={index} className="text-sm">
            <p className="font-medium">Version {index + 1} - Rejected</p>
            <p className="text-xs text-muted-foreground">
              Uploaded {new Date(upload.uploadedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}
            </p>
            {upload.rejectionReason && <p className="text-destructive">{upload.rejectionReason}</p>}
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void view(index)}>
              View rejected file
            </Button>
          </li>
        ))}
      </ul>
      <AttachmentViewerDialog
        url={url}
        subjectRole={null}
        requirementName="Previous rejected upload"
        onClose={() => setUrl(null)}
      />
    </details>
  );
}
