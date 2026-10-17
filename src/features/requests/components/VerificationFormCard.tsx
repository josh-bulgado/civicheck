import { Download } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";
import { useVerificationFormPdfDownload } from "~/features/requests/pdf/useVerificationFormPdfDownload";

interface VerificationFormCardProps extends VerificationFormPdfData {
  /** `portal` is the applicant's softer card; `staff` matches the dashboard panels. */
  variant?: "portal" | "staff";
}

/**
 * Offers the printable Verification Form, filled in from the request's answers.
 * Only requests that collected the requester's name (the certified true copy
 * form) have one, so for other services this renders nothing.
 */
export function VerificationFormCard({
  variant = "portal",
  ...data
}: VerificationFormCardProps) {
  const { download, downloading } = useVerificationFormPdfDownload();
  const hasForm = typeof data.formData.requester_first_name === "string";
  if (!hasForm) return null;

  const button = (
    <Button
      className={
        variant === "portal"
          ? "h-11.5 shrink-0 rounded-full bg-primary-soft px-5 text-[15px] font-semibold text-primary hover:bg-primary-soft/70"
          : "shrink-0"
      }
      disabled={downloading}
      onClick={() => download(data)}
    >
      <Download data-icon="inline-start" aria-hidden="true" />
      {downloading ? "Preparing..." : "Download PDF"}
    </Button>
  );

  if (variant === "staff") {
    return (
      <section className="dashboard-panel flex items-center gap-4 p-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-foreground">Verification form</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The CCRO application, filled in from this request. Print it for the
            requester to sign.
          </p>
        </div>
        {button}
      </section>
    );
  }

  return (
    <section className="flex items-center gap-4 rounded-[28px] bg-card p-6 shadow-portal-card ring-2 ring-border-light md:p-7">
      <div className="min-w-0 flex-1">
        <h2 className="text-[22px] leading-[normal] font-semibold text-foreground">
          Verification form
        </h2>
        <p className="mt-1.5 text-[15px] leading-[1.45] text-muted-foreground">
          Your application form, already filled in. Print it and sign it at the
          CCRO.
        </p>
      </div>
      {button}
    </section>
  );
}
