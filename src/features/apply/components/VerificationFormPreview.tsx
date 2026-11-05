import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { DocumentSkeleton } from "~/components/feedback/PageSkeleton";
import { PdfViewer } from "~/components/pdf/PdfViewer";
import { buildVerificationFormPdf } from "~/features/requests/pdf/useVerificationFormPdfDownload";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";

export function VerificationFormPreview({ data, disabled }: {
  data: VerificationFormPdfData;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[18px] border border-border-light p-5">
      <p className="mb-3 text-base text-body-strong">
        Check your form before you submit. If something is wrong, close the preview
        and click Edit to fix your details.
      </p>
      <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        <Eye data-icon="inline-start" aria-hidden="true" />
        Preview verification form
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Preview verification form</DialogTitle>
            <DialogDescription>
              Check the details on your form. Your tracking number will appear after you submit.
            </DialogDescription>
          </DialogHeader>
          {open && <PreviewPdf data={data} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PreviewPdf({ data }: { data: VerificationFormPdfData }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let previewUrl: string | undefined;
    buildVerificationFormPdf(data).then((blob) => {
      if (cancelled) return;
      previewUrl = URL.createObjectURL(blob);
      setUrl(previewUrl);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [data]);

  if (failed) {
    return <p role="alert">The preview could not load. Close it and try again.</p>;
  }
  return url ? (
    <PdfViewer url={url} title="Verification form preview" className="h-[65vh]" />
  ) : (
    <DocumentSkeleton label="Preparing your form" className="h-[65vh]" />
  );
}
