import { Download, FileText } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { VerificationFormPdfData } from "~/features/requests/pdf/types";
import { useVerificationFormPdfDownload } from "~/features/requests/pdf/useVerificationFormPdfDownload";

interface VerificationFormCardProps extends VerificationFormPdfData {
  /** `action` embeds a compact row in the applicant's Actions card. */
  variant?: "portal" | "staff" | "action";
}

/**
 * Offers the printable Verification Form, filled in from the request's answers.
 * Available for CTC and email assisted requests that collected requester details.
 */
export function VerificationFormCard({
  variant = "portal",
  ...data
}: VerificationFormCardProps) {
  const { download, downloading } = useVerificationFormPdfDownload();
  const isEmailInquiry = typeof data.formData.what_to_verify === "string";
  const isSigned = typeof data.formData.requester_signature === "string" && data.formData.requester_signature.startsWith("data:image/png;base64,");
  const hasForm = typeof data.formData.requester_first_name === "string";
  if (!hasForm) return null;

  if (variant === "action") {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-border-lighter p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary" aria-hidden="true">
          <FileText className="size-6" />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <h3 className="text-base font-semibold">Verification form</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {isEmailInquiry ? "Your completed form. No signature or office visit needed."
              : isSigned ? "Your signed form, saved with this request."
              : "Print your completed form and sign it at the CCRO."}
          </p>
        </div>
        <Button variant="secondary" size="touch" disabled={downloading} onClick={() => download(data)}>
          <Download data-icon="inline-start" aria-hidden="true" />
          {downloading ? "Preparing..." : "Download PDF"}
        </Button>
      </div>
    );
  }

  const button = (
    <Button
      className={
        variant === "portal"
          ? "h-11.5 w-full shrink-0 rounded-full bg-primary-soft px-5 text-[15px] font-semibold text-primary hover:bg-primary-soft/70 @xl:w-auto"
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
            {isEmailInquiry
              ? "The verification form, filled in from this online inquiry. No signature or office visit is needed for this form."
              : isSigned ? "The completed and signed verification form is saved with this request." : "The CCRO application, filled in from this request. Print it for the requester to sign."}
          </p>
        </div>
        {button}
      </section>
    );
  }

  return (
    <section className="flex flex-col items-stretch gap-4 rounded-[28px] bg-card p-6 shadow-portal-card ring-2 ring-border-light @xl:flex-row @xl:items-center md:p-7">
      <div className="min-w-0 flex-1">
        <h2 className="text-[22px] leading-[normal] font-semibold text-foreground">
          Verification form
        </h2>
        <p className="mt-1.5 text-[15px] leading-[1.45] text-muted-foreground">
          {isEmailInquiry
            ? "Your verification form, already filled in. No signature or office visit is needed. Sign your Email Request Letter and, when required, have the owner sign the Authorization Letter."
            : isSigned ? "Your signed verification form is saved with your request for staff to access. Downloading a copy is optional. Bring your required supporting documents for final validation." : "Your application form, already filled in. Print it and sign it at the CCRO."}
        </p>
      </div>
      {button}
    </section>
  );
}
