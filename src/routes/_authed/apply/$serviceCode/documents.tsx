import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Camera, ClipboardCheck, Files, FileText, X } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";
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
import { cn } from "~/lib/utils";
import { Route as ApplyLayoutRoute } from "./route";

export const Route = createFileRoute("/_authed/apply/$serviceCode/documents")({
  component: DocumentsStepRoute,
});

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);
const ACCEPT = [...ACCEPTED_TYPES].join(",");
const CAMERA_ACCEPT = "image/jpeg,image/png";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_FILES = 100;

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
    completed?: number;
    total?: number;
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
    const map = new Map<string, typeof draft.documents>();
    for (const doc of draft.documents) {
      const key = requirementUploadKey(doc.requirementId, doc.subjectRole);
      const existing = map.get(key);
      if (existing) existing.push(doc);
      else map.set(key, [doc]);
    }
    return map;
  }, [draft.documents]);

  const uploadedCount = uploadSlots.filter((slot) =>
    (documentsByRequirement.get(slot.key)?.length ?? 0) > 0,
  ).length;
  const allUploaded = uploadedCount === uploadSlots.length;
  const hasPendingAction = pendingAction !== null;

  async function handleFiles(
    slot: (typeof uploadSlots)[number],
    selectedFiles: File[],
  ) {
    if (selectedFiles.length === 0) return;

    setRowError((prev) => ({ ...prev, [slot.key]: "" }));
    const remainingCapacity = MAX_TOTAL_FILES - draft.documents.length;
    if (remainingCapacity <= 0) {
      setRowError((prev) => ({
        ...prev,
        [slot.key]: `An application can include up to ${MAX_TOTAL_FILES} files. Remove a page before adding another.`,
      }));
      return;
    }

    const files = selectedFiles.slice(0, remainingCapacity);
    const invalidFiles = files.filter(
      (file) => !ACCEPTED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE,
    );
    const validFiles = files.filter((file) => !invalidFiles.includes(file));
    const errors = invalidFiles.map((file) =>
      file.size > MAX_FILE_SIZE
        ? `${file.name} is larger than 10 MB.`
        : `${file.name} is not a JPG, PNG, or PDF.`,
    );

    if (selectedFiles.length > remainingCapacity) {
      errors.push(
        `Only the first ${remainingCapacity} file${remainingCapacity === 1 ? "" : "s"} fit within the ${MAX_TOTAL_FILES}-file application limit.`,
      );
    }
    if (validFiles.length === 0) {
      setRowError((prev) => ({ ...prev, [slot.key]: errors.join(" ") }));
      return;
    }

    setPendingAction({
      slotKey: slot.key,
      type: "upload",
      completed: 0,
      total: validFiles.length,
    });
    try {
      const uploadedDocuments: typeof draft.documents = [];
      let activeUploadDraftId = draft.uploadDraftId;

      for (const [index, file] of validFiles.entries()) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("serviceCode", serviceCode);
        formData.append("requirementId", slot.requirement.id);
        if (slot.subjectRole) formData.append("subjectRole", slot.subjectRole);
        if (activeUploadDraftId) {
          formData.append("uploadDraftId", activeUploadDraftId);
        }

        try {
          const res = await uploadRequestDocumentFn({ data: formData });
          if (res.error) {
            errors.push(`${file.name}: ${res.message || "Upload failed."}`);
          } else {
            activeUploadDraftId = res.uploadDraftId!;
            uploadedDocuments.push({
              requirementId: slot.requirement.id,
              requirementName: slot.requirement.requirement_name,
              subjectRole: slot.subjectRole,
              storagePath: res.storagePath!,
              fileName: res.fileName!,
              fileSize: res.fileSize!,
              uploadedAt: new Date().toISOString(),
            });
          }
        } catch {
          errors.push(`${file.name}: check your connection and try again.`);
        }

        setPendingAction({
          slotKey: slot.key,
          type: "upload",
          completed: index + 1,
          total: validFiles.length,
        });
      }

      if (uploadedDocuments.length > 0) {
        update((prev) => ({
          uploadDraftId: activeUploadDraftId,
          documents: [
            ...(prev.uploadDraftId &&
            activeUploadDraftId &&
            prev.uploadDraftId !== activeUploadDraftId
              ? []
              : prev.documents),
            ...uploadedDocuments,
          ],
        }));
      }
      if (errors.length > 0) {
        setRowError((prev) => ({ ...prev, [slot.key]: errors.join(" ") }));
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function handleRemove(slotKey: string, storagePath: string) {
    const existing = documentsByRequirement
      .get(slotKey)
      ?.find((document) => document.storagePath === storagePath);
    if (!existing) return;
    setRowError((previous) => ({ ...previous, [slotKey]: "" }));
    setPendingAction({ slotKey, type: "remove" });
    try {
      const result = await deleteRequestDocumentFn({
        data: {
          storagePath: existing.storagePath,
          uploadDraftId: draft.uploadDraftId,
        },
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
          (document) => document.storagePath !== storagePath,
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
    const documents = documentsByRequirement.get(slot.key) ?? [];
    const isPending = pendingAction?.slotKey === slot.key;
    const error = rowError[slot.key];
    const pageCount = documents.length;
    const captureInputKey = `${slot.key}:capture`;
    const filesInputKey = `${slot.key}:files`;

    return (
      <article
        key={slot.key}
        aria-busy={isPending}
        className={cn(
          "overflow-hidden rounded-[10px] border bg-card",
          pageCount > 0 ? "border-border" : "border-dashed border-dashed-border",
        )}
      >
        <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-md sm:size-13",
              pageCount > 0
                ? "bg-primary-soft text-primary"
                : "bg-background text-disabled",
            )}
          >
            <FileText className="size-5 sm:size-6" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 break-words text-base font-bold text-foreground">
                {primary}
              </h3>
              {pageCount > 0 ? (
                <Badge variant="success">
                  {pageCount} {pageCount === 1 ? "file" : "files"}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pageCount > 0
                ? "Keep photos in reading order. A multi-page PDF can stay as one file."
                : "Required · add a PDF or photograph each page."}
            </p>
            {isPending ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {pendingAction.type === "remove" ? (
                  "Removing page…"
                ) : (
                  <>
                    <Spinner className="size-3.5" aria-hidden="true" />
                    Uploading{" "}
                    {Math.min(
                      (pendingAction.completed ?? 0) + 1,
                      pendingAction.total ?? 1,
                    )}{" "}
                    of {pendingAction.total ?? 1}…
                  </>
                )}
              </p>
            ) : error ? (
              <p className="mt-1 text-sm text-warning-strong">{error}</p>
            ) : null}
          </div>
        </div>

        <Input
          ref={(element) => {
            fileInputs.current[captureInputKey] = element;
          }}
          type="file"
          accept={CAMERA_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void handleFiles(slot, files);
            event.target.value = "";
          }}
        />

        <Input
          ref={(element) => {
            fileInputs.current[filesInputKey] = element;
          }}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void handleFiles(slot, files);
            event.target.value = "";
          }}
        />

        {pageCount > 0 ? (
          <ol className="flex flex-col border-y border-border-light bg-background">
            {documents.map((document, index) => (
              <li
                key={document.storagePath}
                className="flex min-w-0 items-center gap-3 border-b border-border-light px-4 py-3 last:border-b-0 sm:px-5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    File {index + 1} · {document.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(document.fileSize)} · pending staff review
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={hasPendingAction}
                        aria-label={`Remove file ${index + 1} of ${primary}`}
                      />
                    }
                  >
                    <X />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove file {index + 1}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {document.fileName} will be removed from this document set.
                        Other uploaded pages will stay in the draft.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep file</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={() =>
                          handleRemove(slot.key, document.storagePath)
                        }
                      >
                        Remove file
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ol>
        ) : null}

        <div className="grid grid-cols-1 gap-2 px-4 py-3 min-[420px]:grid-cols-2 sm:flex sm:px-5">
          <Button
            type="button"
            className="min-h-11"
            disabled={hasPendingAction}
            onClick={() => fileInputs.current[captureInputKey]?.click()}
          >
            <Camera data-icon="inline-start" />
            {pageCount > 0 ? "Add photo" : "Take photo"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={hasPendingAction}
            onClick={() => fileInputs.current[filesInputKey]?.click()}
          >
            <Files data-icon="inline-start" />
            {pageCount > 0 ? "Add files" : "Choose files"}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <WizardShell
      step={3}
      title="Upload your documents"
      description="Add every page of each required document so CCRO staff can pre-check the complete set. Take photos one at a time or choose several JPG, PNG, or PDF files, up to 10 MB each."
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
              {uploadedCount} of {uploadSlots.length} requirements ready
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
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
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
