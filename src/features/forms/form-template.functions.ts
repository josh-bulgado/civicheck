import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePermission } from "~/middleware/auth";
import { invalidateServiceCatalogue } from "~/features/services/services.catalogue";
import {
  formTemplateDefinitionSchema,
  type PublishedFormTemplate,
} from "./form-template.types";
import { parseFormTemplateDefinition } from "./form-template.utils";

const serviceCodeSchema = z.string().trim().min(1);

export interface AdminFormTemplate extends PublishedFormTemplate {
  sharedServiceCodes: string[];
}

export const getServiceFormTemplateFn = createServerFn({ method: "GET" })
  .middleware([requirePermission("services:manage")])
  .validator(serviceCodeSchema)
  .handler(async ({ data: serviceCode, context }): Promise<AdminFormTemplate | null> => {
    const { data: binding, error: bindingError } = await context.supabase
      .from("service_form_templates")
      .select("template_id")
      .eq("service_code", serviceCode)
      .maybeSingle();

    if (bindingError) {
      if (bindingError.code === "42P01" || bindingError.code === "PGRST205") return null;
      throw new Error(bindingError.message);
    }
    if (!binding) return null;

    const { data: template, error: templateError } = await context.supabase
      .from("form_templates")
      .select("id, template_key, name, active_version_id")
      .eq("id", binding.template_id)
      .single();
    if (templateError || !template) {
      throw new Error(templateError?.message ?? "Form template not found");
    }

    const [versionResult, sharedResult] = await Promise.all([
      context.supabase
        .from("form_template_versions")
        .select("id, version, definition")
        .eq("id", template.active_version_id)
        .single(),
      context.supabase
        .from("service_form_templates")
        .select("service_code")
        .eq("template_id", template.id)
        .order("service_code"),
    ]);

    if (versionResult.error || !versionResult.data) {
      throw new Error(versionResult.error?.message ?? "Published form version not found");
    }
    if (sharedResult.error) throw new Error(sharedResult.error.message);

    return {
      templateId: template.id,
      templateKey: template.template_key,
      templateName: template.name,
      versionId: versionResult.data.id,
      version: versionResult.data.version,
      definition: parseFormTemplateDefinition(versionResult.data.definition),
      sharedServiceCodes: (sharedResult.data ?? []).map((row) => row.service_code),
    };
  });

const publishTemplateSchema = z.object({
  serviceCode: serviceCodeSchema,
  templateName: z.string().trim().min(1).max(160),
  definition: formTemplateDefinitionSchema,
});

function templateKeyForService(serviceCode: string) {
  return `service-${serviceCode.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
}

/** Publish an immutable version and make it active for every bound service. */
export const publishServiceFormTemplateFn = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator(publishTemplateSchema)
  .handler(async ({ data, context }) => {
    let { data: binding, error: bindingError } = await context.supabase
      .from("service_form_templates")
      .select("template_id")
      .eq("service_code", data.serviceCode)
      .maybeSingle();

    if (bindingError) throw new Error(bindingError.message);

    if (!binding) {
      const { data: createdTemplate, error: createTemplateError } = await context.supabase
        .from("form_templates")
        .insert({
          template_key: templateKeyForService(data.serviceCode),
          name: data.templateName,
          created_by: context.user.id,
        })
        .select("id")
        .single();
      if (createTemplateError || !createdTemplate) {
        throw new Error(createTemplateError?.message ?? "Could not create form template");
      }

      const { data: createdBinding, error: createBindingError } = await context.supabase
        .from("service_form_templates")
        .insert({ service_code: data.serviceCode, template_id: createdTemplate.id })
        .select("template_id")
        .single();
      if (createBindingError || !createdBinding) {
        throw new Error(createBindingError?.message ?? "Could not attach form template");
      }
      binding = createdBinding;
    }

    const { data: latest } = await context.supabase
      .from("form_template_versions")
      .select("version")
      .eq("template_id", binding.template_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (latest?.version ?? 0) + 1;

    const { data: published, error: publishError } = await context.supabase
      .from("form_template_versions")
      .insert({
        template_id: binding.template_id,
        version: nextVersion,
        status: "published",
        definition: data.definition,
        created_by: context.user.id,
        published_by: context.user.id,
        published_at: new Date().toISOString(),
      })
      .select("id, version")
      .single();
    if (publishError || !published) {
      throw new Error(publishError?.message ?? "Could not publish form template");
    }

    const { error: activateError } = await context.supabase
      .from("form_templates")
      .update({
        name: data.templateName,
        active_version_id: published.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", binding.template_id);
    if (activateError) throw new Error(activateError.message);

    invalidateServiceCatalogue();
    return { versionId: published.id, version: published.version };
  });
