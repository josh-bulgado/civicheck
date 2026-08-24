import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { isVisible, parseRequirementName } from "~/features/services/service-utils";
import {
  uploadRequestDocumentFn,
  deleteRequestDocumentFn,
} from "~/features/apply/apply.mutations";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { RequestSummaryCard } from "~/features/apply/components/RequestSummaryCard";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { subjectFullName } from "~/lib/subject-fields";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/documents")({
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
  const { requirements, services } = ApplyLayoutRoute.useLoaderData();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];
  const subjectSummaries = draft.subjects.flatMap((subject) => {
    const name = subjectFullName(subject);
    return name ? [{ role: subject.role, name }] : [];
  });
  const purpose =
    draft.caseAnswers.purpose === "Other"
      ? draft.caseAnswers.otherPurpose
      : draft.caseAnswers.purpose;
  const [pendingAction, setPendingAction] = useState<{
    requirementId: string;
    type: "upload" | "remove";
  } | null>(null);
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
    setPendingAction({ requirementId, type: "upload" });
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
      setPendingAction(null);
    }
  }

  async function handleRemove(requirementId: string) {
    const existing = documentsByRequirement.get(requirementId);
    if (!existing) return;
    setRowError((previous) => ({ ...previous, [requirementId]: "" }));
    setPendingAction({ requirementId, type: "remove" });
    try {
      const result = await deleteRequestDocumentFn({
        data: { storagePath: existing.storagePath },
      });
      if (result.error) {
        setRowError((previous) => ({
          ...previous,
          [requirementId]:
            result.message || "The upload could not be removed. Try again.",
        }));
        return;
      }
      update((previous) => ({
        documents: previous.documents.filter(
          (document) => document.requirementId !== requirementId,
        ),
      }));
    } catch {
      setRowError((previous) => ({
        ...previous,
        [requirementId]:
          "The upload could not be removed. Check your connection and try again.",
      }));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <WizardShell
      step={3}
      title="Upload your documents"
      description="Upload each required document so CCRO staff can pre-check it before your visit. Accepted formats: JPG, PNG, or PDF, up to 10 MB each."
      sidebar={
        (subjectSummaries.length > 0 ||
          (selectedService?.asks_purpose && purpose)) && (
          <RequestSummaryCard
            subjects={subjectSummaries}
            purpose={selectedService?.asks_purpose ? purpose || undefined : undefined}
          />
        )
      }
    >
      <div className="flex flex-col gap-5">
        {mandatoryReqs.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-foreground">
              {uploadedCount} of {mandatoryReqs.length} uploaded
            </h2>
            <div
              role="progressbar"
              aria-label="Required documents uploaded"
              aria-valuemin={0}
              aria-valuemax={mandatoryReqs.length}
              aria-valuenow={uploadedCount}
              className="h-2 w-35 shrink-0 overflow-hidden rounded-full bg-border-lighter"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${(uploadedCount / mandatoryReqs.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!hydrated ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : mandatoryReqs.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-dashed-border bg-white p-5 text-sm italic text-muted-foreground">
            No specific required documents are listed for this service — you can continue.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {mandatoryReqs.map((req) => {
              const { primary } = parseRequirementName(req.requirement_name);
              const doc = documentsByRequirement.get(req.id);
              const isPending = pendingAction?.requirementId === req.id;
              const error = rowError[req.id];

              return (
                <div
                  key={req.id}
                  aria-busy={isPending}
                  className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[10px] border px-5 py-4.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${
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

                  <div className="min-w-0" aria-live="polite">
                    <p className="truncate text-base font-bold text-foreground">{primary}</p>
                    {isPending ? (
                      <p className="text-sm text-muted-foreground">
                        {pendingAction.type === "remove"
                          ? "Removing…"
                          : "Uploading…"}
                      </p>
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

                  <Input
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
                    <div className="col-span-2 flex shrink-0 items-center justify-end gap-2 sm:col-span-1">
                      <Badge variant="success">
                        Uploaded
                      </Badge>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        disabled={isPending}
                        onClick={() => fileInputs.current[req.id]?.click()}
                      >
                        Replace
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={isPending}
                              aria-label={`Remove ${primary}`}
                            />
                          }
                        >
                          <X />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove this upload?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {doc.fileName} will be removed from this draft. You
                              will need to upload the requirement again before
                              continuing.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep upload</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => handleRemove(req.id)}
                            >
                              Remove upload
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled={isPending}
                      onClick={() => fileInputs.current[req.id]?.click()}
                      className="col-span-2 shrink-0 justify-self-end sm:col-span-1"
                    >
                      <Upload data-icon="inline-start" />
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
          navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
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
