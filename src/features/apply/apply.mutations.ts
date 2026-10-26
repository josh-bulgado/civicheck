import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  cleanupAbandonedRequestUploads,
  discardRequestUploadDraft,
} from "~/features/apply/apply-upload-drafts.server";
import {
  loadServiceCatalogue,
  resolveServices,
} from "~/features/services/services.catalogue";
import { requireActiveSession } from "~/server/auth";
import { getSupabaseAdminClient } from "~/utils/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;
const uuidSchema = z.string().uuid();

export const uploadRequestDocumentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const file = data.get("file");
    const serviceCode = data.get("serviceCode")?.toString();
    const requirementId = data.get("requirementId")?.toString();
    const subjectRole = data.get("subjectRole")?.toString() || null;
    const uploadDraftId = data.get("uploadDraftId")?.toString() || null;
    if (!(file instanceof File)) throw new Error("Missing file");
    if (!serviceCode || serviceCode.length > 160) {
      throw new Error("Invalid serviceCode");
    }
    if (subjectRole && subjectRole.length > 160) {
      throw new Error("Invalid subjectRole");
    }
    if (!requirementId || !uuidSchema.safeParse(requirementId).success) {
      throw new Error("Invalid requirementId");
    }
    if (uploadDraftId && !uuidSchema.safeParse(uploadDraftId).success) {
      throw new Error("Invalid uploadDraftId");
    }
    return { file, serviceCode, requirementId, subjectRole, uploadDraftId };
  })
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:create");
    const admin = getSupabaseAdminClient();

    const { file, serviceCode, requirementId, subjectRole } = data;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        error: true,
        message: "Only JPG, PNG, or PDF files are accepted.",
      };
    }
    if (file.size > MAX_SIZE) {
      return { error: true, message: "Files must be 10 MB or smaller." };
    }

    const catalogue = await loadServiceCatalogue();
    const { services, isGroup } = resolveServices(catalogue, serviceCode);
    if (services.length === 0) {
      return { error: true, message: "The selected service does not exist." };
    }
    const requirementKey = isGroup
      ? services[0].display_group!
      : (services[0].requirement_group ?? serviceCode);
    const requirement = (
      catalogue.requirementsByGroup.get(requirementKey) ?? []
    ).find((candidate) => candidate.id === requirementId);
    if (!requirement?.requires_upload) {
      return {
        error: true,
        message: "This document is not an upload requirement for the selected service.",
      };
    }

    let uploadDraftId = data.uploadDraftId;
    if (uploadDraftId) {
      const { data: existingDraft, error: draftError } = await supabase
        .from("request_upload_drafts")
        .select("id")
        .eq("id", uploadDraftId)
        .eq("applicant_id", user.id)
        .eq("scope_key", serviceCode)
        .eq("status", "draft")
        .maybeSingle();
      if (draftError) {
        return { error: true, message: "The upload session could not be verified." };
      }
      if (!existingDraft) uploadDraftId = null;
    }

    if (!uploadDraftId) {
      await cleanupAbandonedRequestUploads();
      const { data: reusableDraft, error: reusableDraftError } = await admin
        .from("request_upload_drafts")
        .select("id")
        .eq("applicant_id", user.id)
        .eq("scope_key", serviceCode)
        .eq("status", "draft")
        .maybeSingle();
      if (reusableDraftError) {
        return { error: true, message: "The upload session could not be started." };
      }
      uploadDraftId = reusableDraft?.id ?? null;
    }

    if (!uploadDraftId) {
      const { data: createdDraft, error: createDraftError } = await admin
        .from("request_upload_drafts")
        .insert({ applicant_id: user.id, scope_key: serviceCode })
        .select("id")
        .single();
      if (createDraftError || !createdDraft) {
        return { error: true, message: "The upload session could not be started." };
      }
      uploadDraftId = createdDraft.id;
    }

    const { count: stagedFileCount, error: countError } = await admin
      .from("request_upload_draft_files")
      .select("id", { count: "exact", head: true })
      .eq("draft_id", uploadDraftId);
    if (countError) {
      return { error: true, message: "The upload session could not be verified." };
    }
    if ((stagedFileCount ?? 0) >= 100) {
      return {
        error: true,
        message: "An application can include up to 100 uploaded files.",
      };
    }

    const safeName = (file.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeRole = (subjectRole ?? "request").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeScope = serviceCode.replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `${user.id}/drafts/${uploadDraftId}/${safeScope}/${requirementId}/${safeRole}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("request-documents")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: true, message: uploadError.message };
    }

    const { error: manifestError } = await admin
      .from("request_upload_draft_files")
      .insert({
        draft_id: uploadDraftId,
        requirement_id: requirementId,
        subject_role: subjectRole,
        storage_path: path,
        file_name: file.name || "upload",
        file_size: file.size,
        mime_type: file.type,
      });
    if (manifestError) {
      await admin.storage.from("request-documents").remove([path]);
      return {
        error: true,
        message: "The uploaded file could not be added to this application draft.",
      };
    }

    const { data: touchedDraft, error: touchError } = await admin
      .from("request_upload_drafts")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", uploadDraftId)
      .eq("applicant_id", user.id)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();
    if (touchError || !touchedDraft) {
      await admin
        .from("request_upload_draft_files")
        .delete()
        .eq("storage_path", path);
      await admin.storage.from("request-documents").remove([path]);
      return {
        error: true,
        message: "The application draft expired. Add the file again.",
      };
    }

    return {
      error: false,
      uploadDraftId,
      storagePath: path,
      fileName: file.name,
      fileSize: file.size,
    };
  });

export const deleteRequestDocumentFn = createServerFn({ method: "POST" })
  .validator((d: { storagePath: string; uploadDraftId: string | null }) => d)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:create");
    const admin = getSupabaseAdminClient();

    if (
      typeof data.storagePath !== "string" ||
      !data.storagePath.startsWith(`${user.id}/`) ||
      data.storagePath.split("/").includes("..")
    ) {
      return { error: true, message: "You can't remove this file." };
    }

    const isStagedPath = data.storagePath.startsWith(`${user.id}/drafts/`);
    if (isStagedPath) {
      if (!data.uploadDraftId || !uuidSchema.safeParse(data.uploadDraftId).success) {
        return { error: true, message: "The upload session could not be verified." };
      }
      const expectedPrefix = `${user.id}/drafts/${data.uploadDraftId}/`;
      if (!data.storagePath.startsWith(expectedPrefix)) {
        return { error: true, message: "You can't remove this file." };
      }
      const { data: fileRecord, error: fileError } = await supabase
        .from("request_upload_draft_files")
        .select("storage_path, request_upload_drafts!inner(status)")
        .eq("draft_id", data.uploadDraftId)
        .eq("storage_path", data.storagePath)
        .eq("request_upload_drafts.applicant_id", user.id)
        .eq("request_upload_drafts.status", "draft")
        .maybeSingle();
      if (fileError || !fileRecord) {
        return { error: true, message: "The staged file could not be verified." };
      }
    }

    // A file already submitted with a request is the evidence staff review.
    // The wizard only ever removes files it has not submitted yet.
    const { count: attachedCount, error: attachedError } = await admin
      .from("requirements_attachments")
      .select("id", { count: "exact", head: true })
      .eq("file_url", data.storagePath);
    if (attachedError || (attachedCount ?? 0) > 0) {
      return { error: true, message: "You can't remove this file." };
    }

    const { error } = await admin.storage
      .from("request-documents")
      .remove([data.storagePath]);

    if (error) return { error: true, message: error.message };
    if (isStagedPath) {
      const { error: manifestError } = await admin
        .from("request_upload_draft_files")
        .delete()
        .eq("draft_id", data.uploadDraftId!)
        .eq("storage_path", data.storagePath);
      if (manifestError) {
        return {
          error: true,
          message: "The file was removed, but the application draft could not be updated.",
        };
      }
      await admin
        .from("request_upload_drafts")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.uploadDraftId!)
        .eq("applicant_id", user.id)
        .eq("status", "draft");
    }
    return { error: false };
  });

const previewUrlsSchema = z.object({
  storagePaths: z.array(z.string().min(1).max(1024)).max(100),
  uploadDraftId: z.string().uuid(),
});

/**
 * Short-lived links to files still staged in the applicant's own upload draft,
 * so the apply wizard can show them back. The bucket is private, so a path alone
 * is not viewable; every path is checked against the draft manifest first.
 */
export const getRequestDocumentPreviewUrlsFn = createServerFn({ method: "POST" })
  .validator((d: { storagePaths: string[]; uploadDraftId: string }) =>
    previewUrlsSchema.parse(d),
  )
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:create");
    const admin = getSupabaseAdminClient();

    const expectedPrefix = `${user.id}/drafts/${data.uploadDraftId}/`;
    const storagePaths = [...new Set(data.storagePaths)];
    if (storagePaths.length === 0) return { error: false, urls: {} };
    if (!storagePaths.every((path) => path.startsWith(expectedPrefix))) {
      return { error: true, message: "You can't preview this file." };
    }

    const { data: records, error: recordsError } = await supabase
      .from("request_upload_draft_files")
      .select("storage_path, request_upload_drafts!inner(status)")
      .eq("draft_id", data.uploadDraftId)
      .in("storage_path", storagePaths)
      .eq("request_upload_drafts.applicant_id", user.id)
      .eq("request_upload_drafts.status", "draft");
    if (recordsError) {
      return { error: true, message: "The staged files could not be verified." };
    }
    const verifiedPaths = (records ?? []).map((record) => record.storage_path);
    if (verifiedPaths.length === 0) return { error: false, urls: {} };

    const { data: signed, error: signError } = await admin.storage
      .from("request-documents")
      .createSignedUrls(verifiedPaths, 60 * 60);
    if (signError || !signed) {
      return { error: true, message: "Could not generate previews for these files." };
    }

    const urls: Record<string, string> = {};
    for (const entry of signed) {
      if (entry.path && entry.signedUrl && !entry.error) {
        urls[entry.path] = entry.signedUrl;
      }
    }
    return { error: false, urls };
  });

export const discardRequestUploadDraftFn = createServerFn({ method: "POST" })
  .validator((d: { uploadDraftId: string | null }) => d)
  .handler(async ({ data }) => {
    if (!data.uploadDraftId || !uuidSchema.safeParse(data.uploadDraftId).success) {
      return { error: false };
    }
    const { user } = await requireActiveSession("requests:create");
    await discardRequestUploadDraft({
      draftId: data.uploadDraftId,
      applicantId: user.id,
    });
    return { error: false };
  });
