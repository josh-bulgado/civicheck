import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { legalDocuments, type LegalDocumentKey } from "../legal-documents";
import { LegalDocumentBody } from "./LegalDocumentBody";

/**
 * A text link that opens a legal document in a dialog instead of navigating
 * away. Used on signup, where leaving the page would throw away what the
 * resident has already typed.
 *
 * The trigger is a real button, so a click on it inside a checkbox label opens
 * the dialog without also ticking the box.
 */
export function LegalDialogLink({
  document,
  className,
  children,
}: {
  document: LegalDocumentKey;
  className?: string;
  children: React.ReactNode;
}) {
  const doc = legalDocuments[document];

  return (
    <Dialog>
      <DialogTrigger className={className}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
          <DialogDescription>{doc.summary}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[55vh]">
          <div className="pr-4">
            <LegalDocumentBody document={doc} sectionHeading="h3" />
          </div>
        </ScrollArea>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
