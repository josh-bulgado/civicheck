import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ClipboardCheck, Files, FileText, FileX, X } from "lucide-react";
import { RequiredMark } from "~/components/ui/required-mark";
import { Input } from "~/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
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
import { SlotCardSkeleton } from "~/features/apply/components/WizardPageSkeleton";
import {
  AfterDelay,
  ConnectionNotice,
  WizardBar,
  WizardSpinner,
  useConnectionState,
} from "~/features/apply/components/wizard-feedback";
import {
  CameraCaptureDialog,
  canUseBrowserCamera,
} from "~/features/apply/components/CameraCaptureDialog";
import { DocumentPreview } from "~/features/apply/components/DocumentPreview";
import { useApplyDraft, type ApplyDraftDocument } from "~/features/apply/hooks/useApplyDraft";
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

/** A card's upload or removal that did not go through: what to say, and how to try again. */
interface SlotFailure {
  message: string;
  /** What the server said, when it said something specific. */
  detail?: string;
  retry: () => void;
}

interface RemovalTarget {
  slotKey: string;
  storagePath: string;
  index: number;
  fileName: string;
  fileSize: number;
  /** "{role}: {requirement}", or the requirement alone. */
  caption: string;
}

interface DocumentsStepProps {
  serviceCode: string;
  requirements: ServiceDetail["requirements"];
  services: ServiceDetail["services"];
}

export function DocumentsStep({ serviceCode, requirements, services }: DocumentsStepProps) {
  const navigate = useNavigate();
  const { draft, update, hydrated } = useApplyDraft(serviceCode);
  // The draft as of the latest render. A "Try again" button keeps the
  // `handleFiles` of the render it was made in, so reading `draft` there would
  // restart the retry from the draft as it was before the batch's first file
  // landed: no upload draft yet, and the files already uploaded forgotten.
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
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
    /** The file being removed, so its row can step back while it goes. */
    storagePath?: string;
  } | null>(null);
  // Files of the running upload batch that have not landed yet, for their rows.
  const [pendingFiles, setPendingFiles] = useState<{ name: string; size: number }[]>([]);
  // Plain notes (a file-count limit, say) versus failures that offer a retry.
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<Record<string, SlotFailure | undefined>>({});
  // Raised by pressing Next while a document is missing: which cards are empty.
  const [showMissing, setShowMissing] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  // Bumped by Cancel. A batch that sees a different number than it started with
  // stops, and cleans up whatever it managed to upload meanwhile.
  const uploadRun = useRef(0);
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
  // The file the "Remove file?" dialog is asking about, and whether it is working.
  // `removal` outlives `removalOpen`, so the dialog keeps its content while it
  // animates closed instead of collapsing to an empty box.
  const [removal, setRemoval] = useState<RemovalTarget | null>(null);
  const [removalOpen, setRemovalOpen] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);
  const keepFile = useRef<HTMLButtonElement>(null);

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
    const map = new Map<string, ApplyDraftDocument[]>();
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

  const allUploaded = uploadSlots.every(
    (slot) => (documentsByRequirement.get(slot.key)?.length ?? 0) > 0,
  );
  const hasPendingAction = pendingAction !== null;
  // The wait is the connection's, not ours, once it runs long or is offline.
  const connection = useConnectionState(hasPendingAction);

  function setSlotFailure(slotKey: string, next: SlotFailure | undefined) {
    setFailure((previous) => ({ ...previous, [slotKey]: next }));
  }

  async function handleFiles(
    slot: (typeof uploadSlots)[number],
    selectedFiles: File[],
    source: "camera" | "files",
  ) {
    if (selectedFiles.length === 0) return;

    setRowError((prev) => ({ ...prev, [slot.key]: "" }));
    setSlotFailure(slot.key, undefined);
    const remainingCapacity =
      MAX_TOTAL_FILES - latestDraft.current.documents.length;
    if (remainingCapacity <= 0) {
      setRowError((prev) => ({
        ...prev,
        [slot.key]: `An application can include up to ${MAX_TOTAL_FILES} files. Remove a page before adding another.`,
      }));
      return;
    }

    const runId = ++uploadRun.current;
    const cancelled = () => uploadRun.current !== runId;

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
    if (cancelled()) return;
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
    const notes: string[] = [];

    if (selectedFiles.length > remainingCapacity) {
      notes.push(
        `Only the first ${remainingCapacity} file${remainingCapacity === 1 ? "" : "s"} fit within the ${MAX_TOTAL_FILES}-file application limit.`,
      );
    }
    if (validFiles.length === 0) {
      setRowError((prev) => ({ ...prev, [slot.key]: notes.join(" ") }));
      setPendingAction(null);
      return;
    }

    setPendingAction({
      slotKey: slot.key,
      type: "upload",
      completed: 0,
      total: validFiles.length,
    });
    setPendingFiles(validFiles.map((file) => ({ name: file.name, size: file.size })));
    try {
      const uploadedDocuments: typeof draft.documents = [];
      const failedFiles: File[] = [];
      let serverDetail: string | undefined;
      let activeUploadDraftId = latestDraft.current.uploadDraftId;
      // Cancelled: none of this batch is kept, and the applicant never saw the
      // files that had already landed, so take them back out too.
      const discardLanded = () => {
        for (const landed of uploadedDocuments) {
          evictCachedFile(landed.storagePath);
          void deleteRequestDocumentFn({
            data: {
              storagePath: landed.storagePath,
              uploadDraftId: activeUploadDraftId,
            },
          }).catch(() => {});
        }
      };

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
          if (cancelled()) {
            // Cancelled while it was on its way: it landed anyway, so take it
            // back out rather than leave a file nobody is looking at.
            if (!res.error && res.storagePath) {
              void deleteRequestDocumentFn({
                data: {
                  storagePath: res.storagePath,
                  uploadDraftId: res.uploadDraftId ?? activeUploadDraftId,
                },
              }).catch(() => {});
            }
            discardLanded();
            return;
          }
          if (res.error) {
            failedFiles.push(file);
            serverDetail ??= res.message || undefined;
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
          if (cancelled()) {
            discardLanded();
            return;
          }
          failedFiles.push(file);
        }

        setPendingFiles((previous) => previous.slice(1));
        setPendingAction({
          slotKey: slot.key,
          type: "upload",
          completed: index + 1,
          total: validFiles.length,
        });
      }

      if (uploadedDocuments.length > 0) {
        const kept = update((prev) => ({
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
        if (!kept) {
          // The application was discarded while these were on their way, so
          // nothing refers to them: take them back out.
          discardLanded();
          return;
        }
      }
      if (notes.length > 0) {
        setRowError((prev) => ({ ...prev, [slot.key]: notes.join(" ") }));
      }
      if (failedFiles.length > 0) {
        setSlotFailure(slot.key, {
          message: `Could not upload ${failedFiles.map((file) => file.name).join(", ")}.`,
          detail: serverDetail,
          // The files were already prepared, so they go back through as chosen ones.
          retry: () => void handleFiles(slot, failedFiles, "files"),
        });
      }
    } finally {
      if (!cancelled()) {
        setPendingAction(null);
        setPendingFiles([]);
      }
    }
  }

  /** Stops waiting on the running upload. Whatever lands afterwards is removed again. */
  function cancelUpload() {
    uploadRun.current += 1;
    setPendingAction(null);
    setPendingFiles([]);
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
    const current = latestDraft.current;
    const existing = current.documents.find(
      (document) => document.storagePath === storagePath,
    );
    if (!existing) return;
    setRowError((previous) => ({ ...previous, [slotKey]: "" }));
    setSlotFailure(slotKey, undefined);
    setPendingAction({ slotKey, type: "remove", storagePath });
    const failed = () =>
      setSlotFailure(slotKey, {
        message: "Could not remove the file. Check your connection and try again.",
        retry: () => void handleRemove(slotKey, storagePath),
      });
    try {
      const result = await deleteRequestDocumentFn({
        data: {
          storagePath: existing.storagePath,
          uploadDraftId: current.uploadDraftId,
        },
      });
      if (result.error) {
        failed();
        return;
      }
      evictCachedFile(storagePath);
      update((previous) => ({
        documents: previous.documents.filter(
          (document) => document.storagePath !== storagePath,
        ),
      }));
    } catch {
      failed();
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmRemoval() {
    if (!removal || removeBusy) return;
    setRemoveBusy(true);
    await handleRemove(removal.slotKey, removal.storagePath);
    setRemoveBusy(false);
    // On success the row is gone; on failure the card says so and offers to retry.
    setRemovalOpen(false);
  }

  /**
   * Where focus goes when the dialog closes. After a removal the button that
   * opened it is gone, so focus would fall to the page: put it on the card's
   * next file instead, or on its first action when it has none left.
   */
  function removalFinalFocus() {
    if (!removal) return true;
    const card = document.getElementById(`slot-${removal.slotKey}`);
    if (!card) return true;
    const removeButtons = Array.from(
      card.querySelectorAll<HTMLButtonElement>("button[data-remove-file]"),
    ).filter((button) => !button.disabled);
    return (
      removeButtons.find((button) => button.dataset.removeFile === removal.storagePath) ??
      removeButtons[0] ??
      card.querySelector<HTMLButtonElement>("button:not(:disabled)") ??
      true
    );
  }

  function handleNext() {
    if (allUploaded) {
      navigate({ to: "/apply/$serviceCode/review", params: { serviceCode } });
      return;
    }
    // Pressing a button that is not ready is how you ask what is missing.
    setShowMissing(true);
    const firstEmpty = uploadSlots.find(
      (slot) => (documentsByRequirement.get(slot.key)?.length ?? 0) === 0,
    );
    if (firstEmpty) {
      document
        .getElementById(`slot-${firstEmpty.key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function renderUploadSlot(slot: (typeof uploadSlots)[number]) {
    const req = slot.requirement;
    const { primary } = parseRequirementName(req.requirement_name);
    const documents = documentsByRequirement.get(slot.key) ?? [];
    const isPending = pendingAction?.slotKey === slot.key;
    const uploading = isPending && pendingAction.type === "upload";
    const removing = isPending && pendingAction.type === "remove";
    const note = rowError[slot.key];
    const slotFailure = failure[slot.key];
    const pageCount = documents.length;
    const captureInputKey = `${slot.key}:capture`;
    const filesInputKey = `${slot.key}:files`;
    const isDropTarget = dragSlotKey === slot.key;
    const isMissing = showMissing && pageCount === 0;

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
        id={`slot-${slot.key}`}
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
          "overflow-hidden rounded-[20px] bg-card transition-[background-color,box-shadow,border-color] duration-150",
          isDropTarget
            ? "border-2 border-solid border-primary bg-primary-soft shadow-[0_0_0_4px_rgba(11,77,162,0.18)]"
            : pageCount > 0
              ? "border border-solid border-border-light"
              : cn(
                  "border-2 border-dashed",
                  isMissing ? "border-destructive" : "border-[#b9c7de] dark:border-border-strong",
                ),
        )}
      >
        <div className="flex items-start gap-4 px-5 pt-5.5 pb-4.5 sm:px-6">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-[14px] transition-colors",
              isDropTarget
                ? "bg-card text-primary"
                : pageCount > 0
                  ? "bg-primary-soft text-primary"
                  : "bg-portal-panel text-[#8a97a8] dark:text-muted-foreground",
            )}
          >
            <FileText className="size-6.5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1" aria-live="polite">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h3 className="min-w-0 text-[19px] leading-snug font-bold wrap-break-word text-foreground">
                {primary} <RequiredMark />
              </h3>
              {pageCount > 0 ? (
                // Keyed on the count so each added or removed file replays the
                // pop, which is what makes the tally read as having changed.
                <span
                  key={pageCount}
                  className="civic-enter-scale inline-flex h-7 items-center rounded-full bg-[#e2f2e7] dark:bg-tone-success-soft px-3 text-[13px] font-semibold text-tone-success"
                >
                  {pageCount} {pageCount === 1 ? "file" : "files"}
                </span>
              ) : null}
            </div>

            {uploading || removing ? (
              <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-body-2">
                <WizardSpinner className="size-4 border-2" />
                {removing
                  ? "Removing…"
                  : `Uploading ${Math.min(
                      (pendingAction.completed ?? 0) + 1,
                      pendingAction.total ?? 1,
                    )} of ${pendingAction.total ?? 1}…`}
              </p>
            ) : (
              <p
                className={cn(
                  "mt-1 text-[15px] leading-snug",
                  isDropTarget
                    ? "font-semibold text-primary-hover"
                    : isMissing
                      ? "font-semibold text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {isDropTarget
                  ? "Drop to add to this document."
                  : pageCount > 0
                    ? "Keep photos in reading order. A multi-page PDF can stay as one file."
                    : "Required · add a PDF or photograph each page."}
              </p>
            )}

            {note && !slotFailure ? (
              <p className="mt-1.5 text-[15px] leading-snug text-warning-strong">{note}</p>
            ) : null}

            {slotFailure ? (
              <div className="mt-2 flex flex-col gap-2.5">
                <p className="text-[15px] leading-snug font-semibold text-destructive">
                  {slotFailure.message}
                  {slotFailure.detail ? ` ${slotFailure.detail}` : ""}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSlotFailure(slot.key, undefined);
                      slotFailure.retry();
                    }}
                    disabled={hasPendingAction}
                    className="civic-press h-12 rounded-full bg-primary-fill px-6 text-base font-semibold text-white hover:bg-primary-fill-hover disabled:opacity-60"
                  >
                    Try again
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotFailure(slot.key, undefined)}
                    className="civic-press rounded-full px-1 py-2 text-[15px] font-semibold text-body-2 hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
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

        {pageCount > 0 || (uploading && pendingFiles.length > 0) ? (
          <ol className="flex flex-col border-t border-border-light bg-portal-panel">
            {documents.map((document, index) => {
              const fresh = freshPaths.current.has(document.storagePath);
              const beingRemoved =
                removing && pendingAction.storagePath === document.storagePath;
              return (
                <li
                  key={document.storagePath}
                  className={cn(
                    "border-b border-border-light px-5 py-3 transition-opacity last:border-b-0 sm:px-6",
                    fresh && "civic-upload-land",
                    beingRemoved && "opacity-55",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="relative flex size-8.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                      <span className={cn(fresh && "civic-upload-number")}>{index + 1}</span>
                      {fresh ? (
                        <span
                          aria-hidden="true"
                          className="civic-upload-check absolute inset-0 flex items-center justify-center rounded-full bg-success text-white dark:text-background"
                        >
                          <Check className="size-4" strokeWidth={3} />
                        </span>
                      ) : null}
                    </span>
                    <DocumentPreview
                      className="size-11.5 rounded-lg"
                      fileName={document.fileName}
                      url={previewUrls[document.storagePath]}
                      label={`File ${index + 1} of ${primary}`}
                      onUrlError={() => refreshPreviewUrl(document.storagePath)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-foreground">
                        File {index + 1} · {document.fileName}
                      </p>
                      <p className="text-[13px] text-muted-foreground">
                        {formatSize(document.fileSize)} · pending staff review
                      </p>
                    </div>
                    <button
                      type="button"
                      data-remove-file={document.storagePath}
                      disabled={hasPendingAction}
                      aria-label={`Remove file ${index + 1} of ${primary}`}
                      onClick={() => {
                        setRemoval({
                          slotKey: slot.key,
                          storagePath: document.storagePath,
                          index: index + 1,
                          fileName: document.fileName,
                          fileSize: document.fileSize,
                          caption: `${slot.subjectRole ? `${slot.subjectRole}: ` : ""}${primary}`,
                        });
                        setRemovalOpen(true);
                      }}
                      className="civic-press flex size-9.5 shrink-0 items-center justify-center rounded-full text-body-2 hover:bg-card hover:text-destructive disabled:opacity-40"
                    >
                      <X className="size-5" aria-hidden="true" />
                    </button>
                  </div>
                  {beingRemoved ? (
                    <p className="mt-2 flex items-center gap-2 pl-12 text-[15px] font-semibold text-body-2">
                      <WizardSpinner className="size-4 border-2" />
                      Removing…
                    </p>
                  ) : null}
                </li>
              );
            })}

            {/* Files on their way: the name and size, a bar, and, once the wait is
                the connection's, what that means and a way out. */}
            {uploading
              ? pendingFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${index}`}
                    className="border-b border-border-light px-5 py-3 last:border-b-0 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span
                        className="flex size-8.5 shrink-0 items-center justify-center rounded-full bg-card text-sm font-bold text-muted-foreground"
                        aria-hidden="true"
                      >
                        {pageCount + index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-foreground">
                          {file.name}
                        </p>
                        <p className="text-[13px] text-muted-foreground">
                          {formatSize(file.size)} · Uploading
                        </p>
                        <WizardBar className="mt-2 h-1.5" />
                        {connection ? (
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                              Waiting for connection…
                            </span>
                            <button
                              type="button"
                              onClick={cancelUpload}
                              className="civic-press rounded-full px-1 py-1 text-[15px] font-semibold text-body-2 hover:text-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))
              : null}
          </ol>
        ) : null}

        <div
          className={cn(
            "grid grid-cols-1 items-center gap-3 px-5 pt-4 pb-5 min-[420px]:grid-cols-2 sm:flex sm:px-6",
            hasPendingAction && "[&>button]:opacity-45",
          )}
        >
          <button
            type="button"
            disabled={hasPendingAction}
            onClick={() => startPhoto(slot)}
            className="civic-press inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-primary-fill px-6 text-base font-semibold text-white hover:bg-primary-fill-hover disabled:cursor-default"
          >
            <Camera className="size-5" aria-hidden="true" />
            {pageCount > 0 ? "Add photo" : "Take photo"}
          </button>
          <button
            type="button"
            disabled={hasPendingAction}
            onClick={() => fileInputs.current[filesInputKey]?.click()}
            className="civic-press inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-[#cfd8e8] dark:border-border-strong bg-card px-6 text-base font-semibold text-foreground hover:bg-primary-tint disabled:cursor-default"
          >
            <Files className="size-5" aria-hidden="true" />
            {pageCount > 0 ? "Add files" : "Choose files"}
          </button>
          {/* Dragging needs a mouse or trackpad, so touch screens skip the hint. */}
          <p className="hidden text-[15px] text-muted-foreground pointer-fine:sm:block">
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
      description="Take photos one at a time, or choose or drag in several JPG, PNG, or PDF files, up to 10&nbsp;MB each."
      sidebar={
        summaryRows.length > 0 ? <RequestSummaryCard rows={summaryRows} /> : null
      }
    >
      <div className="flex flex-col gap-7">
        <ConnectionNotice state={connection} />

        {!hydrated ? (
          // Shapes in the layout the slots will take, held back 200ms so a quick
          // read of the draft never flashes them.
          <AfterDelay>
            <div className="flex flex-col gap-3.5">
              <SlotCardSkeleton />
              <SlotCardSkeleton />
            </div>
          </AfterDelay>
        ) : mandatoryReqs.length === 0 ? (
          <p className="rounded-[20px] border border-dashed border-[#b9c7de] dark:border-border-strong bg-card p-5 text-[15px] text-muted-foreground italic">
            No specific required documents are listed for this service — you can continue.
          </p>
        ) : null}

        {hydrated
          ? uploadGroups.map((group) => (
              <section key={group.role ?? "request"} className="flex flex-col gap-3.5">
                <div>
                  <h2 className="text-xl leading-[normal] font-bold text-foreground">
                    {group.role ? `${group.role}’s documents` : "Shared documents"}
                  </h2>
                  {group.name ? (
                    <p className="mt-0.5 text-[15px] text-muted-foreground">{group.name}</p>
                  ) : null}
                </div>
                {group.slots.map(renderUploadSlot)}
              </section>
            ))
          : null}

        {hydrated && inPersonRequirements.length > 0 ? (
          <section className="rounded-[20px] border border-border-light bg-portal-panel p-5.5">
            <div className="flex items-start gap-3.5">
              <ClipboardCheck className="mt-0.5 size-5.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground">
                  {selectedService.service_code === "EMAIL_INQUIRY"
                    ? "Prepared for you - no upload needed"
                    : "Complete at the CCRO - no upload needed"}
                </h2>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px] text-body-2">
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

      {/* Remove a file (3t). It stays open and busy while the request runs, and
          Escape and a click outside are ignored until it is done. */}
      <AlertDialog
        open={removalOpen}
        onOpenChange={(open) => {
          if (!open && !removeBusy) setRemovalOpen(false);
        }}
      >
        <AlertDialogContent
          initialFocus={keepFile}
          finalFocus={removalFinalFocus}
          overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
          className="apply-wizard w-[min(32.5rem,calc(100%-2rem))] grid-cols-[minmax(0,1fr)] gap-0 rounded-[28px] bg-card p-8 pb-7 shadow-portal-dialog ring-0 data-[size=default]:max-w-none data-[size=default]:sm:max-w-none"
        >
          {removal ? (
            <>
              <AlertDialogTitle className="font-sans text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-foreground">
                Remove file {removal.index}?
              </AlertDialogTitle>
              <div className="mt-5 flex items-center gap-3.5 rounded-2xl bg-portal-panel px-4 py-3.5">
                <DocumentPreview
                  className="size-12 rounded-xl bg-card"
                  fileName={removal.fileName}
                  url={previewUrls[removal.storagePath]}
                  label={removal.fileName}
                  onUrlError={() => refreshPreviewUrl(removal.storagePath)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-foreground">
                    {removal.fileName}
                  </p>
                  <p className="truncate text-sm text-muted-2">
                    {formatSize(removal.fileSize)} · {removal.caption}
                  </p>
                </div>
              </div>

              {removeBusy ? (
                <WizardBar tone="danger" className="mt-5 h-1" />
              ) : (
                <AlertDialogDescription className="mt-5 text-base leading-snug text-body-2">
                  Your other pages stay in the draft.
                </AlertDialogDescription>
              )}

              <div className="mt-6 flex justify-end gap-2.5">
                {/* Both stay focusable while busy (`aria-disabled`, not `disabled`),
                    so focus doesn't drop to the page mid-request. A press does
                    nothing: the dialog ignores a close until the request ends. */}
                <AlertDialogCancel
                  ref={keepFile}
                  aria-disabled={removeBusy}
                  className={cn(
                    "civic-press h-13 rounded-full border bg-card px-7 text-base font-semibold shadow-none",
                    removeBusy
                      ? "cursor-default border-border-light text-[#8a97a8] dark:text-muted-foreground opacity-100"
                      : "border-primary text-foreground hover:bg-primary-tint focus-visible:ring-4 focus-visible:ring-primary/20",
                  )}
                >
                  Keep file
                </AlertDialogCancel>
                <button
                  type="button"
                  onClick={() => void confirmRemoval()}
                  aria-disabled={removeBusy}
                  className={cn(
                    "civic-press inline-flex h-13 items-center justify-center gap-2.5 rounded-full bg-destructive px-7 text-base font-semibold text-white dark:text-background",
                    removeBusy ? "cursor-default opacity-85" : "hover:bg-destructive/90",
                  )}
                >
                  {removeBusy ? <WizardSpinner /> : null}
                  {removeBusy ? "Removing…" : "Remove file"}
                </button>
              </div>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectedOpen} onOpenChange={setRejectedOpen}>
        <AlertDialogContent
          overlayClassName="bg-[rgba(15,27,45,0.28)] backdrop-blur-sm"
          className="apply-wizard gap-4 rounded-[28px] bg-card p-7 shadow-portal-dialog ring-0 data-[size=default]:sm:max-w-md"
        >
          {/* The only way out besides Escape: there is nothing to confirm. */}
          <AlertDialogCancel
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            className="absolute top-4 right-4 rounded-full text-foreground"
          >
            <X className="size-4" strokeWidth={2.5} aria-hidden="true" />
          </AlertDialogCancel>
          <AlertDialogHeader className="gap-y-0.5 pr-9 has-data-[slot=alert-dialog-media]:gap-x-3 sm:grid-cols-[auto_1fr]">
            <AlertDialogMedia className="mb-0 size-11 self-center rounded-xl bg-portal-danger-soft text-destructive">
              <FileX className="size-5.5" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle className="font-sans text-lg">
              {rejectedFiles.length === 1
                ? hasSizeRejection
                  ? "This file is too large"
                  : "This file can't be uploaded"
                : `${rejectedFiles.length} files can't be uploaded`}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[15px] leading-snug">
              {hasTypeRejection
                ? "Only JPG, PNG, or PDF files are accepted, up to 10 MB each."
                : "Each file must be 10 MB or smaller."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-2xl bg-portal-panel px-3.5 py-2.5">
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
                    <span className="block text-xs font-normal text-muted-2">
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
        onContinue={handleNext}
        continueLabel="Next"
        // Not ready until every card has a file, but still pressable: a press
        // shows which ones are empty.
        continueReady={allUploaded}
      />
    </WizardShell>
  );
}
