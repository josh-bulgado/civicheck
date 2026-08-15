import { createServerFn } from "@tanstack/react-start";
import { getSupabaseServerClient } from "~/utils/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024;

export const uploadRequestDocumentFn = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const file = data.get("file");
    const serviceCode = data.get("serviceCode")?.toString();
    const requirementId = data.get("requirementId")?.toString();
    if (!(file instanceof File)) throw new Error("Missing file");
    if (!serviceCode) throw new Error("Missing serviceCode");
    if (!requirementId) throw new Error("Missing requirementId");
    return { file, serviceCode, requirementId };
  })
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: please log in again." };
    }

    const { file, serviceCode, requirementId } = data;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        error: true,
        message: "Only JPG, PNG, or PDF files are accepted.",
      };
    }
    if (file.size > MAX_SIZE) {
      return { error: true, message: "Files must be 10 MB or smaller." };
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${serviceCode}/${requirementId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("request-documents")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: true, message: uploadError.message };
    }

    return {
      error: false,
      storagePath: path,
      fileName: file.name,
      fileSize: file.size,
    };
  });

export const deleteRequestDocumentFn = createServerFn({ method: "POST" })
  .validator((d: { storagePath: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { error: true, message: "Unauthorized: please log in again." };
    }

    if (!data.storagePath.startsWith(`${user.id}/`)) {
      return { error: true, message: "You can't remove this file." };
    }

    const { error } = await supabase.storage
      .from("request-documents")
      .remove([data.storagePath]);

    if (error) return { error: true, message: error.message };
    return { error: false };
  });
