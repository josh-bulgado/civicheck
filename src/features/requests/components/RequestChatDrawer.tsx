import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { RequestMessagesCard } from "~/features/requests/components/RequestMessagesCard";
import type { RequestMessage } from "~/features/requests/request-messages";

/**
 * The chat with the applicant, opened from the Documents tab so a reply can be
 * written without leaving the documents.
 */
export function RequestChatDrawer({
  open,
  onOpenChange,
  requestId,
  messages,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  messages: RequestMessage[];
  onSent: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Opens on the reply box, so pressing C and typing just works. */}
      <SheetContent
        side="right"
        className="w-full sm:max-w-md"
        initialFocus={() => document.getElementById(`message-draft-${requestId}`)}
      >
        <SheetHeader>
          <SheetTitle>Chat with the applicant</SheetTitle>
          <SheetDescription>
            Replies appear on the applicant’s request page right away.
          </SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <RequestMessagesCard
            variant="bare"
            requestId={requestId}
            messages={messages}
            viewer="staff"
            onSent={onSent}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
