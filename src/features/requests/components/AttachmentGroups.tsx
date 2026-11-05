import type { ReactNode } from "react";
import { describeRequirement } from "~/features/services/requirement-display";

interface GroupableDoc {
  id: string;
  requirementName: string;
  subjectRole: string | null;
  verificationStatus: string;
}

/**
 * One requirement can have several uploaded files (one row each). This keeps
 * the files of the same requirement — and the same subject, e.g. "Father" —
 * together, in the order they were uploaded.
 */
export function groupByRequirement<T extends GroupableDoc>(docs: T[]) {
  const groups = new Map<string, { title: string; docs: T[] }>();
  for (const doc of docs) {
    const key = `${doc.subjectRole ?? ""}::${doc.requirementName}`;
    const group = groups.get(key);
    if (group) {
      group.docs.push(doc);
    } else {
      groups.set(key, {
        title: `${doc.subjectRole ? `${doc.subjectRole}: ` : ""}${doc.requirementName}`,
        docs: [doc],
      });
    }
  }
  return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
}

export function AttachmentGroups<T extends GroupableDoc>({
  docs,
  numberingDocs = docs,
  renderRow,
}: {
  docs: T[];
  /** Preserve file numbers when an action section shows only some of a group's files. */
  numberingDocs?: T[];
  /** `title` is set only for files inside a multi-file group ("File 1 of 3"). */
  renderRow: (doc: T, title?: string) => ReactNode;
}) {
  const numberingGroups = new Map(groupByRequirement(numberingDocs).map((group) => [group.key, group]));
  return (
    <>
      {groupByRequirement(docs).map((group) => {
        const numbered = numberingGroups.get(group.key) ?? group;
        // A single file needs no group chrome — it renders exactly as before.
        if (numbered.docs.length === 1) return renderRow(group.docs[0]);

        const accepted = numbered.docs.filter(
          (doc) => doc.verificationStatus === "approved",
        ).length;
        const display = describeRequirement(group.docs[0].requirementName);
        const role = group.docs[0].subjectRole;
        return (
          <div
            key={group.key}
            className="flex flex-col gap-3 rounded-xl border border-border-light bg-muted/20 p-3"
          >
            <div className="flex items-baseline justify-between gap-3 px-1">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground">{role ? `${role}: ` : ""}{display.title}</h3>
                {display.detail && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{display.detail}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {accepted} of {numbered.docs.length} accepted
              </span>
            </div>
            {group.docs.map((doc) =>
              renderRow(doc, `File ${numbered.docs.findIndex((candidate) => candidate.id === doc.id) + 1} of ${numbered.docs.length}`),
            )}
          </div>
        );
      })}
    </>
  );
}
