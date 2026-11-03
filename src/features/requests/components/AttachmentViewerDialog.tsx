import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { AttachmentPreview } from "~/features/requests/components/AttachmentPreview";

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
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {subjectRole ? `${subjectRole}: ` : ""}
            {requirementName}
          </DialogTitle>
        </DialogHeader>
        {url && (
          <AttachmentPreview
            url={url}
            name={requirementName}
            className="h-[75vh]"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
