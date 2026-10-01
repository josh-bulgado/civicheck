import type { ReactNode } from "react";

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
function groupByRequirement<T extends GroupableDoc>(docs: T[]) {
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
  renderRow,
}: {
  docs: T[];
  /** `title` is set only for files inside a multi-file group ("File 1 of 3"). */
  renderRow: (doc: T, title?: string) => ReactNode;
}) {
  return (
    <>
      {groupByRequirement(docs).map((group) => {
        // A single file needs no group chrome — it renders exactly as before.
        if (group.docs.length === 1) return renderRow(group.docs[0]);

        const accepted = group.docs.filter(
          (doc) => doc.verificationStatus === "approved",
        ).length;
        return (
          <div
            key={group.key}
            className="flex flex-col gap-3 rounded-xl border border-border-light bg-muted/20 p-3"
          >
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
              <span className="text-xs text-muted-foreground">
                {accepted} of {group.docs.length} accepted
              </span>
            </div>
            {group.docs.map((doc, index) =>
              renderRow(doc, `File ${index + 1} of ${group.docs.length}`),
            )}
          </div>
        );
      })}
    </>
  );
}
