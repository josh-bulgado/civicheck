import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  ClipboardCheck,
  Files,
  FileText,
  FileX,
  X,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { RequiredMark } from "~/components/ui/required-mark";
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
  AlertDialogMedia,
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
import {
  prepareUploadFile,
  uploadTypeOf,
} from "~/features/apply/upload-image.utils";
import { WizardShell } from "~/features/apply/components/WizardShell";
import { WizardFooterActions } from "~/features/apply/components/WizardFooterActions";
import { RequestSummaryCard } from "~/features/apply/components/RequestSummaryCard";
import {
  CameraCaptureDialog,
  canUseBrowserCamera,
} from "~/features/apply/components/CameraCaptureDialog";
import { DocumentPreview } from "~/features/apply/components/DocumentPreview";
import { useApplyDraft } from "~/features/apply/hooks/useApplyDraft";
import { useDocumentPreviewUrls } from "~/features/apply/hooks/useDocumentPreviewUrls";
import { canonicalizeTemplateAnswers } from "~/features/forms/form-template.utils";
import {
  expandRequirementUploadSlots,
  requirementUploadKey,
} from "~/features/services/requirement-upload.utils";
import { buildSummaryRows } from "~/features/apply/summary-rows";
import { evictCachedFile, primeCachedFile } from "~/lib/file-preview-cache";
import { cn } from "~/lib/utils";

const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);
const ACCEPT = [...ACCEPTED_TYPES].join(",");
const CAMERA_ACCEPT = "image/jpeg,image/png";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_FILES = 100;

/** True while the pointer is dragging files in from the desktop, not page text or a link. */
function isFileDrag(event: { dataTransfer: DataTransfer | null }) {
  return event.dataTransfer?.types.includes("Files") ?? false;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RejectedFile {
  name: string;
  reason: "type" | "size";
  /** Shown under the name, e.g. the size of a file that is over the limit. */
  detail?: string;
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
  const legacyPurpose =
    draft.caseAnswers.purpose === "Other"
      ? draft.caseAnswers.otherPurpose
      : draft.caseAnswers.purpose;
  // Everything the applicant has entered so far, as the review step will read
  // it back. Unanswered fields are left out rather than shown as blanks.
  const summaryRows = buildSummaryRows({
    definition,
    answers: canonicalizeTemplateAnswers(definition, {
      ...draft.answers,
      ...draft.caseSelectorAnswers,
    }),
    subjects: draft.subjects,
    legacyPurpose: selectedService?.asks_purpose ? legacyPurpose : undefined,
  });
  const [pendingAction, setPendingAction] = useState<{
    slotKey: string;
    type: "upload" | "remove";
    completed?: number;
    total?: number;
  } | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  // The slot being photographed in the in-browser camera dialog, if any.
  const [cameraSlot, setCameraSlot] = useState<
    ReturnType<typeof expandRequirementUploadSlots>[number] | null
  >(null);
  // The slot a dragged file is currently hovering over, if any.
  const [dragSlotKey, setDragSlotKey] = useState<string | null>(null);
  // Files turned away for their type or size. The entries outlive
  // `rejectedOpen` so the dialog doesn't empty out while it animates closed.
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([]);
  const [rejectedOpen, setRejectedOpen] = useState(false);
  const hasTypeRejection = rejectedFiles.some((file) => file.reason === "type");
  const hasSizeRejection = rejectedFiles.some((file) => file.reason === "size");

  // A file dropped anywhere outside a slot would otherwise make the browser
  // open it, replacing the wizard. Swallow those misses for as long as this
  // step is on screen; the slots handle their own drops before this runs.
  useEffect(() => {
    function swallowFileDrop(event: DragEvent) {
      if (!isFileDrag(event) || event.defaultPrevented) return;
      event.preventDefault();
      if (event.dataTransfer && event.type === "dragover") {
        event.dataTransfer.dropEffect = "none";
      }
    }
    window.addEventListener("dragover", swallowFileDrop);
    window.addEventListener("drop", swallowFileDrop);
    return () => {
      window.removeEventListener("dragover", swallowFileDrop);
      window.removeEventListener("drop", swallowFileDrop);
    };
  }, []);

  const mandatoryReqs = useMemo(
    () =>
      requirements.filter(
        (requirement) =>
          requirement.is_mandatory &&
          isRequirementApplicable(
            requirement,
            draft.selectedServiceCode,
            canonicalizeTemplateAnswers(definition, {
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

  const { urls: previewUrls, refresh: refreshPreviewUrl } =
    useDocumentPreviewUrls(
      draft.uploadDraftId,
      draft.documents.map((document) => document.storagePath),
    );

  // Rows that were already on screen when the step hydrated are "known"; a
  // path that shows up afterwards is an upload that just landed and plays the
  // arrival animation. `freshPaths` only grows, so a row keeps its animation
  // classes for the life of the element — dropping them on the next render
  // would cut the animation short, and a class that stays never replays.
  const knownPaths = useRef<Set<string> | null>(null);
  const freshPaths = useRef<Set<string>>(new Set());
  if (hydrated) {
    if (knownPaths.current === null) {
      knownPaths.current = new Set(
        draft.documents.map((document) => document.storagePath),
      );
    } else {
      for (const document of draft.documents) {
        if (knownPaths.current.has(document.storagePath)) continue;
        knownPaths.current.add(document.storagePath);
        freshPaths.current.add(document.storagePath);
      }
    }
  }

  const uploadedCount = uploadSlots.filter((slot) =>
    (documentsByRequirement.get(slot.key)?.length ?? 0) > 0,
  ).length;
  const allUploaded = uploadedCount === uploadSlots.length;
  const hasPendingAction = pendingAction !== null;

  async function handleFiles(
    slot: (typeof uploadSlots)[number],
    selectedFiles: File[],
    source: "camera" | "files",
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

    // Camera photos are resized and re-encoded on the device first; it takes a
    // moment, so show the card as busy before validating the prepared files.
    setPendingAction({
      slotKey: slot.key,
      type: "upload",
      completed: 0,
      total: Math.min(selectedFiles.length, remainingCapacity),
    });
    // Only the camera hands over formats worth converting (HEIC, WebP). A
    // chosen or dropped file has to be a JPG, PNG, or PDF already, so anything
    // else skips the conversion and is turned away by the check below.
    const files = await Promise.all(
      selectedFiles
        .slice(0, remainingCapacity)
        .map((file) =>
          source === "camera" || ACCEPTED_TYPES.has(uploadTypeOf(file))
            ? prepareUploadFile(file)
            : file,
        ),
    );
    const unsupportedFiles = files.filter(
      (file) => !ACCEPTED_TYPES.has(file.type),
    );
    const oversizedFiles = files.filter(
      (file) => !unsupportedFiles.includes(file) && file.size > MAX_FILE_SIZE,
    );
    const validFiles = files.filter(
      (file) => !unsupportedFiles.includes(file) && !oversizedFiles.includes(file),
    );
    // A wrong file type or an oversized file is announced in a dialog rather
    // than on the card: the card's message area is for what happened to files
    // it could accept.
    const rejected: RejectedFile[] = [
      ...unsupportedFiles.map((file) => ({
        name: file.name,
        reason: "type" as const,
      })),
      ...oversizedFiles.map((file) => ({
        name: file.name,
        reason: "size" as const,
        detail: `${formatSize(file.size)} — over the 10 MB limit`,
      })),
    ];
    if (rejected.length > 0) {
      setRejectedFiles(rejected);
      setRejectedOpen(true);
    }
    const errors: string[] = [];

    if (selectedFiles.length > remainingCapacity) {
      errors.push(
        `Only the first ${remainingCapacity} file${remainingCapacity === 1 ? "" : "s"} fit within the ${MAX_TOTAL_FILES}-file application limit.`,
      );
    }
    if (validFiles.length === 0) {
      setRowError((prev) => ({ ...prev, [slot.key]: errors.join(" ") }));
      setPendingAction(null);
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
            // The browser already holds this file; keep it so the first
            // preview doesn't download it back.
            primeCachedFile(res.storagePath!, file);
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

  /**
   * Desktop browsers get a live camera preview in a dialog (the browser asks
   * for camera permission first). Phones and tablets, and any browser without
   * camera access (an insecure origin, say), keep the file input's `capture`
   * hint, which opens the native camera app or, failing that, a file chooser.
   */
  function startPhoto(slot: (typeof uploadSlots)[number]) {
    if (canUseBrowserCamera()) {
      setCameraSlot(slot);
      return;
    }
    fileInputs.current[`${slot.key}:capture`]?.click();
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
      evictCachedFile(storagePath);
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
    const isDropTarget = dragSlotKey === slot.key;

    // Dropped files take the same path as chosen ones, so the type, size and
    // file-count checks in `handleFiles` apply to them unchanged.
    function handleDragOver(event: React.DragEvent<HTMLElement>) {
      if (!isFileDrag(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = hasPendingAction ? "none" : "copy";
      if (!hasPendingAction) setDragSlotKey(slot.key);
    }

    return (
      <article
        key={slot.key}
        aria-busy={isPending}
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={(event) => {
          // Moving between the card's own children fires this too.
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
            return;
          }
          setDragSlotKey((current) => (current === slot.key ? null : current));
        }}
        onDrop={(event) => {
          if (!isFileDrag(event)) return;
          event.preventDefault();
          setDragSlotKey(null);
          if (hasPendingAction) return;
          void handleFiles(slot, Array.from(event.dataTransfer.files), "files");
        }}
        className={cn(
          "overflow-hidden rounded-[10px] border bg-card transition-colors",
          isDropTarget
            ? "border-primary bg-primary-soft ring-2 ring-primary/30"
            : pageCount > 0
              ? "border-border-light"
              : "border-dashed border-border",
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
                {primary} <RequiredMark />
              </h3>
              {pageCount > 0 ? (
                // Keyed on the count so each added or removed file replays the
                // pop, which is what makes the tally read as having changed.
                <Badge
                  key={pageCount}
                  variant="success"
                  className="civic-enter-scale"
                >
                  {pageCount} {pageCount === 1 ? "file" : "files"}
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {isDropTarget
                ? "Drop to add to this document."
                : pageCount > 0
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
            if (files.length > 0) void handleFiles(slot, files, "camera");
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
            if (files.length > 0) void handleFiles(slot, files, "files");
            event.target.value = "";
          }}
        />

        {pageCount > 0 ? (
          <ol className="flex flex-col border-y border-border-light bg-background">
            {documents.map((document, index) => (
              <li
                key={document.storagePath}
                className={cn(
                  "flex min-w-0 items-center gap-3 border-b border-border-light px-4 py-3 last:border-b-0 sm:px-5",
                  freshPaths.current.has(document.storagePath) &&
                    "civic-upload-land",
                )}
              >
                <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                  <span
                    className={cn(
                      freshPaths.current.has(document.storagePath) &&
                        "civic-upload-number",
                    )}
                  >
                    {index + 1}
                  </span>
                  {freshPaths.current.has(document.storagePath) ? (
                    <span
                      aria-hidden="true"
                      className="civic-upload-check absolute inset-0 flex items-center justify-center rounded-full bg-success text-white"
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </span>
                  ) : null}
                </span>
                <DocumentPreview
                  fileName={document.fileName}
                  url={previewUrls[document.storagePath]}
                  label={`File ${index + 1} of ${primary}`}
                  onUrlError={() => refreshPreviewUrl(document.storagePath)}
                />
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
                  {/* The popup is portaled out of the wizard wrapper, so it
                      re-applies `.apply-wizard` to keep that contrast pass. */}
                  <AlertDialogContent className="apply-wizard">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove file {index + 1}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        <span className="font-semibold wrap-anywhere text-foreground">
                          {document.fileName}
                        </span>{" "}
                        will be removed from this document set. Other uploaded
                        pages will stay in the draft.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="min-h-11">
                        Keep file
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        // Solid, not the variant's pale tint: this is the
                        // dialog's one irreversible action.
                        className="min-h-11 bg-destructive text-white hover:bg-destructive/90"
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
            onClick={() => startPhoto(slot)}
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
          {/* Dragging needs a mouse or trackpad, so touch screens skip the hint. */}
          <p className="hidden self-center text-sm text-muted-foreground pointer-fine:sm:block">
            or drag and drop files here
          </p>
        </div>
      </article>
    );
  }

  return (
    <WizardShell
      step={3}
      title="Upload your documents"
      description="Take photos one at a time, or choose or drag in several JPG, PNG, or PDF files, up to 10 MB each."
      sidebar={
        summaryRows.length > 0 ? <RequestSummaryCard rows={summaryRows} /> : null
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
              className="h-2 w-35 shrink-0 overflow-hidden rounded-full bg-border-light"
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
          <p className="rounded-[10px] border border-dashed border-border bg-white p-5 text-sm italic text-muted-foreground">
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
          <section className="rounded-[10px] border border-border-light bg-surface-subtle p-5">
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

      <CameraCaptureDialog
        open={cameraSlot !== null}
        onOpenChange={(open) => {
          if (!open) setCameraSlot(null);
        }}
        documentName={
          cameraSlot
            ? parseRequirementName(cameraSlot.requirement.requirement_name)
                .primary
            : "your document"
        }
        onCapture={(file) => {
          const slot = cameraSlot;
          setCameraSlot(null);
          if (slot) void handleFiles(slot, [file], "camera");
        }}
        onChooseFile={() => {
          const slot = cameraSlot;
          setCameraSlot(null);
          if (slot) fileInputs.current[`${slot.key}:files`]?.click();
        }}
      />

      <AlertDialog open={rejectedOpen} onOpenChange={setRejectedOpen}>
        <AlertDialogContent className="apply-wizard gap-4 p-5 data-[size=default]:sm:max-w-md">
          {/* The only way out besides Escape: there is nothing to confirm. */}
          <AlertDialogCancel
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            className="absolute top-3 right-3 text-foreground"
          >
            <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </AlertDialogCancel>
          <AlertDialogHeader className="gap-y-0.5 pr-9 has-data-[slot=alert-dialog-media]:gap-x-3 sm:grid-cols-[auto_1fr]">
            <AlertDialogMedia className="mb-0 size-10 self-center bg-destructive/10 text-destructive">
              <FileX className="size-5" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-base">
              {rejectedFiles.length === 1
                ? hasSizeRejection
                  ? "This file is too large"
                  : "This file can't be uploaded"
                : `${rejectedFiles.length} files can't be uploaded`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-snug">
              {hasTypeRejection
                ? "Only JPG, PNG, or PDF files are accepted, up to 10 MB each."
                : "Each file must be 10 MB or smaller."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-lg border border-border-light bg-surface-subtle px-3 py-2">
            {rejectedFiles.map((file, index) => (
              <li
                key={`${index}:${file.name}`}
                className="flex items-start gap-2 text-sm font-semibold text-foreground"
              >
                <X
                  className="mt-0.5 size-3.5 shrink-0 text-destructive"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="wrap-anywhere">{file.name}</span>
                  {file.detail ? (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {file.detail}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </AlertDialogContent>
      </AlertDialog>

      <WizardFooterActions
        onBack={() =>
          navigate({ to: "/apply/$serviceCode/details", params: { serviceCode } })
        }
        onContinue={() =>
          navigate({ to: "/apply/$serviceCode/review", params: { serviceCode } })
        }
        continueLabel="Next"
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
