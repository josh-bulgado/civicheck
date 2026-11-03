import type { LegalDocument } from "../legal-documents";

/**
 * The text of a legal document, with no page chrome around it. Shared by the
 * signup dialog and the standalone /terms and /privacy pages so the two can
 * never drift apart.
 */
export function LegalDocumentBody({
  document,
  sectionHeading: Heading = "h2",
}: {
  document: LegalDocument;
  /** Heading level for section titles — one below whatever holds the document title. */
  sectionHeading?: "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-6 text-sm leading-relaxed text-body">
      <p className="text-xs text-muted-foreground">
        Effective: {document.effective}
      </p>

      {document.sections.map((section, index) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <Heading className="text-sm font-semibold text-foreground">
            {index + 1}. {section.heading}
          </Heading>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.items ? (
            <ul className="flex list-disc flex-col gap-1 pl-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
