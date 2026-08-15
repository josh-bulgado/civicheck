import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { parseRequirementName } from "~/features/services/service-utils";
import { isVisible } from "~/features/services/components/RequirementChecklist";
import {
  uploadRequestDocumentFn,
  deleteRequestDocumentFn,
} from "~/features/apply/apply.mutations";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/apply/$serviceCode/documents")({
  component: DocumentsStepRoute,
});

const ACCEPT = "image/jpeg,image/png,application/pdf";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsStepRoute() {
  const { serviceCode } = Route.useParams();
  const navigate = useNavigate();
  const { requirements } = ApplyLayoutRoute.useLoaderData();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const mandatoryReqs = useMemo(
    () =>
      requirements.filter(
        (r) => r.is_mandatory && isVisible(r, draft.selectedServiceCode),
      ),
    [requirements, draft.selectedServiceCode],
  );

  const documentsByRequirement = useMemo(() => {
    const map = new Map<string, (typeof draft.documents)[number]>();
    for (const doc of draft.documents) map.set(doc.requirementId, doc);
    return map;
  }, [draft.documents]);

  const uploadedCount = mandatoryReqs.filter((r) => documentsByRequirement.has(r.id)).length;
  const allUploaded = mandatoryReqs.length > 0 && uploadedCount === mandatoryReqs.length;

  async function handleFile(requirementId: string, requirementName: string, file: File) {
    setRowError((prev) => ({ ...prev, [requirementId]: "" }));
    setPendingId(requirementId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("serviceCode", serviceCode);
      formData.append("requirementId", requirementId);

      const res = await uploadRequestDocumentFn({ data: formData });

      if (res.error) {
        setRowError((prev) => ({ ...prev, [requirementId]: res.message || "Upload failed." }));
        return;
      }

      const existing = documentsByRequirement.get(requirementId);
      if (existing) {
        await deleteRequestDocumentFn({ data: { storagePath: existing.storagePath } });
      }

      update((prev) => ({
        documents: [
          ...prev.documents.filter((d) => d.requirementId !== requirementId),
          {
            requirementId,
            requirementName,
            storagePath: res.storagePath!,
            fileName: res.fileName!,
            fileSize: res.fileSize!,
            uploadedAt: new Date().toISOString(),
          },
        ],
      }));
    } finally {
      setPendingId(null);
    }
  }

  async function handleRemove(requirementId: string) {
    const existing = documentsByRequirement.get(requirementId);
    if (!existing) return;
    await deleteRequestDocumentFn({ data: { storagePath: existing.storagePath } });
    update((prev) => ({
      documents: prev.documents.filter((d) => d.requirementId !== requirementId),
    }));
  }

  return (
    <WizardShell
      title="Upload your documents"
      description="Upload each required document so CCRO staff can pre-check it before your visit. Accepted formats: JPG, PNG, or PDF, up to 10 MB each."
    >
      <div className="flex flex-col gap-5">
        <h2 className="text-base font-bold text-foreground">
          {uploadedCount} of {mandatoryReqs.length} uploaded
        </h2>

        {!hydrated ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : mandatoryReqs.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-dashed-border bg-white p-5 text-sm italic text-muted-foreground">
            No specific required documents are listed for this service — you can continue.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {mandatoryReqs.map((req) => {
              const { primary } = parseRequirementName(req.requirement_name);
              const doc = documentsByRequirement.get(req.id);
              const isPending = pendingId === req.id;
              const error = rowError[req.id];

              return (
                <div
                  key={req.id}
                  className={`flex items-center gap-4 rounded-[10px] border px-5 py-4.5 ${
                    doc ? "border-border bg-white" : "border-dashed border-dashed-border bg-white"
                  }`}
                >
                  <div
                    className={`flex size-13 shrink-0 items-center justify-center rounded-md ${
                      doc ? "bg-primary-soft text-primary" : "bg-background text-disabled"
                    }`}
                  >
                    <FileText className="size-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-bold text-foreground">{primary}</p>
                    {isPending ? (
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    ) : error ? (
                      <p className="text-sm text-warning-strong">{error}</p>
                    ) : doc ? (
                      <p className="text-sm text-muted-foreground">
                        {doc.fileName} · {formatSize(doc.fileSize)} · pending staff review
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Required · not uploaded yet</p>
                    )}
                  </div>

                  <input
                    ref={(el) => {
                      fileInputs.current[req.id] = el;
                    }}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(req.id, req.requirement_name, file);
                      e.target.value = "";
                    }}
                  />

                  {doc ? (
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputs.current[req.id]?.click()}
                        className="text-sm font-bold text-primary hover:text-primary-hover"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(req.id)}
                        aria-label={`Remove ${primary}`}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => fileInputs.current[req.id]?.click()}
                      className="shrink-0"
                    >
                      <Upload className="size-3.5" />
                      Upload
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WizardFooterActions
        onBack={() =>
          navigate({ to: "/apply/$serviceCode/case", params: { serviceCode } })
        }
        onContinue={() =>
          navigate({ to: "/apply/$serviceCode/review", params: { serviceCode } })
        }
        continueLabel="Continue to review"
        continueDisabled={mandatoryReqs.length > 0 && !allUploaded}
        note={
          mandatoryReqs.length > 0 && !allUploaded
            ? "Upload every required document to continue"
            : undefined
        }
      />
    </WizardShell>
  );
}
