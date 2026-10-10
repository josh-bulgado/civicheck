import { Link } from "@tanstack/react-router";
import SiteFooter from "~/features/landing/components/SiteFooter";
import SiteHeader from "~/features/landing/components/SiteHeader";
import { LegalDocumentBody } from "./components/LegalDocumentBody";
import { legalDocuments, type LegalDocumentKey } from "./legal-documents";

/** Standalone, linkable version of a legal document (/terms, /privacy). */
export default function LegalPage({
  documentKey,
}: {
  documentKey: LegalDocumentKey;
}) {
  const doc = legalDocuments[documentKey];
  const other = legalDocuments[documentKey === "terms" ? "privacy" : "terms"];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="mx-auto w-full max-w-190 flex-1 px-5 pb-14 pt-12 sm:px-8 sm:pt-14">
        <header className="civic-enter mb-8 flex flex-col gap-3">
          <h1 className="civic-title text-[clamp(1.75rem,4vw,2.25rem)] leading-tight">
            {doc.title}
          </h1>
          <p className="text-base leading-relaxed text-body">{doc.summary}</p>
        </header>

        <div className="civic-card p-5 sm:p-8">
          <LegalDocumentBody document={doc} />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Also read the{" "}
          <Link
            to={documentKey === "terms" ? "/privacy" : "/terms"}
            className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            {other.title}
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
