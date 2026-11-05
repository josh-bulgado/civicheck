import type { ReactNode } from "react";
import { ExternalLink, FileText, ImageIcon, X } from "lucide-react";
import { QuietAnchor } from "~/components/quiet-link";
import { Button } from "~/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";

/** The same document workspace for uploaded photos and PDFs. */
export function FilePreviewDialogContent({
  title,
  kind,
  url,
  fileName,
  children,
}: {
  title: string;
  kind: "image" | "pdf" | "other";
  url: string;
  fileName?: string;
  children: ReactNode;
}) {
  const Icon = kind === "image" ? ImageIcon : FileText;

  return (
    <DialogContent
      showCloseButton={false}
      className="flex h-[min(88dvh,48rem)] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-5xl"
    >
      <div className="flex shrink-0 items-start gap-2 p-4 sm:gap-3 sm:px-7 sm:py-6">
        <DialogHeader className="min-w-0 flex-1 gap-2">
          <DialogTitle className="text-lg leading-snug font-semibold wrap-anywhere text-foreground sm:text-xl">
            {title}
          </DialogTitle>
          <DialogDescription className="flex items-start gap-2 text-xs">
            <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              Uploaded requirement · {kind === "pdf" ? "PDF preview" : kind === "image" ? "Image preview" : "File preview"}
              {fileName ? <span className="block truncate" title={fileName}>{fileName}</span> : null}
            </span>
          </DialogDescription>
        </DialogHeader>
        <Button
          variant="ghost"
          size="icon-touch"
          shape="soft"
          nativeButton={false}
          render={<QuietAnchor href={url} target="_blank" rel="noopener noreferrer" />}
          aria-label="Open file in a new tab"
          title="Open file in a new tab"
        >
          <ExternalLink aria-hidden="true" />
        </Button>
        <DialogClose render={<Button variant="secondary" size="icon-touch" shape="soft" />} aria-label="Close preview">
          <X aria-hidden="true" />
        </DialogClose>
      </div>
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-7 sm:pt-5">
        {children}
      </div>
    </DialogContent>
  );
}
