import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ClipboardCheck, FileText, Upload, X } from "lucide-react";
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
import {
  isRequirementApplicable,
  parseRequirementName,
} from "~/features/services/service-utils";
import type { ServiceDetail } from "~/features/services/services.queries";
import {
  uploadRequestDocumentFn,
  deleteRequestDocumentFn,
} from "~/features/apply/apply.mutations";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { RequestSummaryCard } from "~/features/apply/components/RequestSummaryCard";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { deriveTemplateAnswers } from "~/features/forms/form-template.utils";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import { subjectFullName } from "~/lib/subject-fields";

const ACCEPT = "image/jpeg,image/png,application/pdf";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsStepProps {
  serviceCode: string;
  requirements: ServiceDetail["requirements"];
  services: ServiceDetail["services"];
}

export function DocumentsStep({ serviceCode, requirements, services }: DocumentsStepProps) {
  const navigate = useNavigate();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  const selectedService =
    services.find((s) => s.service_code === draft.selectedServiceCode) ?? services[0];
  const definition = selectedService.form_template!.definition;
  const subjectSummaries = draft.subjects.flatMap((subject) => {
    const name = subjectFullName(subject);
    return name ? [{ role: subject.role, name }] : [];
  });
  const purpose =
    draft.caseAnswers.purpose === "Other"
      ? draft.caseAnswers.otherPurpose
      : draft.caseAnswers.purpose;
  const [pendingAction, setPendingAction] = useState<{
    slotKey: string;
    type: "upload" | "remove";
  } | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const mandatoryReqs = useMemo(
    () =>
      requirements.filter(
        (requirement) =>
          requirement.is_mandatory &&
          isRequirementApplicable(
            requirement,
            draft.selectedServiceCode,
            deriveTemplateAnswers(definition, {
              ...draft.answers,
              ...draft.caseSelectorAnswers,
            }),
          ),
      ),
    [
      requirements,
      draft.selectedServiceCode,
      draft.answers,
      draft.caseSelectorAnswers,
      definition,
    ],
  );

  const uploadSlots = useMemo(
    () => expandRequirementUploadSlots(mandatoryReqs, draft.subjects),
    [mandatoryReqs, draft.subjects],
  );
  const inPersonRequirements = useMemo(
    () => mandatoryReqs.filter((requirement) => !requirement.requires_upload),
    [mandatoryReqs],
  );
  const uploadGroups = useMemo(() => {
    const groups = new Map<
      string,
      { role: string | null; name: string | null; slots: typeof uploadSlots }
    >();
    for (const slot of uploadSlots) {
      const groupKey = slot.subjectRole ?? "request";
      const existing = groups.get(groupKey);
      if (existing) existing.slots.push(slot);
      else {
        groups.set(groupKey, {
          role: slot.subjectRole,
          name: slot.subjectName,
          slots: [slot],
        });
      }
    }
    return [...groups.values()];
  }, [uploadSlots]);

  const documentsByRequirement = useMemo(() => {
    const map = new Map<string, (typeof draft.documents)[number]>();
    for (const doc of draft.documents) {
      map.set(requirementUploadKey(doc.requirementId, doc.subjectRole), doc);
    }
    return map;
  }, [draft.documents]);

  const uploadedCount = uploadSlots.filter((slot) =>
    documentsByRequirement.has(slot.key),
  ).length;
  const allUploaded = uploadedCount === uploadSlots.length;

  async function handleFile(
    slot: (typeof uploadSlots)[number],
    file: File,
  ) {
    setRowError((prev) => ({ ...prev, [slot.key]: "" }));
    setPendingAction({ slotKey: slot.key, type: "upload" });
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("serviceCode", serviceCode);
      formData.append("requirementId", slot.requirement.id);
      if (slot.subjectRole) formData.append("subjectRole", slot.subjectRole);

      const res = await uploadRequestDocumentFn({ data: formData });

      if (res.error) {
        setRowError((prev) => ({
          ...prev,
          [slot.key]: res.message || "Upload failed.",
        }));
        return;
      }

      const existing = documentsByRequirement.get(slot.key);
      if (existing) {
        await deleteRequestDocumentFn({ data: { storagePath: existing.storagePath } });
      }

      update((prev) => ({
        documents: [
          ...prev.documents.filter(
            (document) =>
              requirementUploadKey(
                document.requirementId,
                document.subjectRole,
              ) !== slot.key,
          ),
          {
            requirementId: slot.requirement.id,
            requirementName: slot.requirement.requirement_name,
            subjectRole: slot.subjectRole,
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

  async function handleRemove(slotKey: string) {
    const existing = documentsByRequirement.get(slotKey);
    if (!existing) return;
    setRowError((previous) => ({ ...previous, [slotKey]: "" }));
    setPendingAction({ slotKey, type: "remove" });
    try {
      const result = await deleteRequestDocumentFn({
        data: { storagePath: existing.storagePath },
      });
      if (result.error) {
        setRowError((previous) => ({
          ...previous,
          [slotKey]:
            result.message || "The upload could not be removed. Try again.",
        }));
        return;
      }
      update((previous) => ({
        documents: previous.documents.filter(
          (document) =>
            requirementUploadKey(
              document.requirementId,
              document.subjectRole,
            ) !== slotKey,
        ),
      }));
    } catch {
      setRowError((previous) => ({
        ...previous,
        [slotKey]:
          "The upload could not be removed. Check your connection and try again.",
      }));
    } finally {
      setPendingAction(null);
    }
  }

  function renderUploadSlot(slot: (typeof uploadSlots)[number]) {
    const req = slot.requirement;
    const { primary } = parseRequirementName(req.requirement_name);
    const doc = documentsByRequirement.get(slot.key);
    const isPending = pendingAction?.slotKey === slot.key;
    const error = rowError[slot.key];

    return (
      <div
        key={slot.key}
        aria-busy={isPending}
        className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-[10px] border px-5 py-4.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] ${
          doc
            ? "border-border bg-white"
            : "border-dashed border-dashed-border bg-white"
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
              {pendingAction.type === "remove" ? "Removing…" : "Uploading…"}
            </p>
          ) : error ? (
            <p className="text-sm text-warning-strong">{error}</p>
          ) : doc ? (
            <p className="text-sm text-muted-foreground">
              {doc.fileName} · {formatSize(doc.fileSize)} · pending staff review
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Required · not uploaded yet
            </p>
          )}
        </div>

        <Input
          ref={(element) => {
            fileInputs.current[slot.key] = element;
          }}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(slot, file);
            event.target.value = "";
          }}
        />

        {doc ? (
          <div className="col-span-2 flex shrink-0 items-center justify-end gap-2 sm:col-span-1">
            <Badge variant="success">Uploaded</Badge>
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={isPending}
              onClick={() => fileInputs.current[slot.key]?.click()}
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
                    aria-label={`Remove ${primary}${slot.subjectRole ? ` for ${slot.subjectRole}` : ""}`}
                  />
                }
              >
                <X />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this upload?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {doc.fileName} will be removed from this draft. You will need
                    to upload the requirement again before continuing.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep upload</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => handleRemove(slot.key)}
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
            onClick={() => fileInputs.current[slot.key]?.click()}
            className="col-span-2 shrink-0 justify-self-end sm:col-span-1"
          >
            <Upload data-icon="inline-start" />
            Upload
          </Button>
        )}
      </div>
    );
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
        {uploadSlots.length > 0 && (
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold text-foreground">
              {uploadedCount} of {uploadSlots.length} uploaded
            </h2>
            <div
              role="progressbar"
              aria-label="Required documents uploaded"
              aria-valuemin={0}
              aria-valuemax={uploadSlots.length}
              aria-valuenow={uploadedCount}
              className="h-2 w-35 shrink-0 overflow-hidden rounded-full bg-border-lighter"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${(uploadedCount / uploadSlots.length) * 100}%` }}
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
        ) : null}

        {hydrated
          ? uploadGroups.map((group) => (
              <section key={group.role ?? "request"} className="flex flex-col gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">
                    {group.role ? `${group.role}’s documents` : "Shared documents"}
                  </h2>
                  {group.name ? (
                    <p className="text-sm text-muted-foreground">{group.name}</p>
                  ) : null}
                </div>
                {group.slots.map(renderUploadSlot)}
              </section>
            ))
          : null}

        {hydrated && inPersonRequirements.length > 0 ? (
          <section className="rounded-[10px] border border-border bg-surface-subtle p-5">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h2 className="font-bold text-foreground">
                  Complete at the CCRO — no upload needed
                </h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {inPersonRequirements.map((requirement) => (
                    <li key={requirement.id}>
                      {parseRequirementName(requirement.requirement_name).primary}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <WizardFooterActions
        onBack={() =>
          navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
        }
        onContinue={() =>
          navigate({ to: "/apply/$serviceCode/review", params: { serviceCode } })
        }
        continueLabel="Continue to review"
        continueDisabled={!allUploaded}
        note={
          !allUploaded
            ? "Upload every required document to continue"
            : undefined
        }
      />
    </WizardShell>
  );
}
