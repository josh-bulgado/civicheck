import { FilePreviewDialogContent } from "~/components/file-preview/FilePreviewDialogContent";
import { Dialog } from "~/components/ui/dialog";
import { requirementDisplayName } from "~/features/services/requirement-display";
import { AttachmentPreview, getFileKind } from "~/features/requests/components/AttachmentPreview";

/**
 * Previews a signed attachment URL. Open while `url` is set; the caller owns
 * fetching the URL and clears it via `onClose`.
 */
export function AttachmentViewerDialog({
  url,
  subjectRole,
  requirementName,
  onClose,
}: {
  url: string | null;
  subjectRole: string | null;
  requirementName: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={url != null} onOpenChange={(open) => !open && onClose()}>
      {url && (
        <FilePreviewDialogContent
          title={`${subjectRole ? `${subjectRole}: ` : ""}${requirementDisplayName(requirementName)}`}
          kind={getFileKind(url)}
          url={url}
        >
          <AttachmentPreview
            url={url}
            name={requirementDisplayName(requirementName)}
            className="min-h-0 flex-1"
          />
        </FilePreviewDialogContent>
      )}
    </Dialog>
  );
}
