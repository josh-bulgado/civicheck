import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePermission } from "~/middleware/auth";
import {
  assertFormFitsRegistry,
  recordServiceAudit,
  runSaveServiceConfiguration,
} from "~/features/admin/services/service-configuration.server";
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
  /** Active version the editor loaded; null when the service has no form yet. */
  expectedVersionId: z.string().uuid().nullable(),
});

/**
 * Publish an immutable version and make it active for every bound service.
 *
 * Goes through the same database function as the service editor's save, so the
 * new version and its activation commit together, and a publish that would
 * overwrite another admin's newer version is refused instead.
 */
export const publishServiceFormTemplateFn = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator(publishTemplateSchema)
  .handler(async ({ data, context }) => {
    await assertFormFitsRegistry(
      context.supabase,
      data.serviceCode,
      data.definition,
    );

    const { form } = await runSaveServiceConfiguration(context.supabase, {
      serviceCode: data.serviceCode,
      create: false,
      service: null,
      requirements: null,
      form: {
        templateName: data.templateName,
        definition: data.definition,
        expectedVersionId: data.expectedVersionId,
      },
    });
    if (!form) throw new Error("Could not publish form template");

    invalidateServiceCatalogue();
    if (form.published) {
      await recordServiceAudit(context.user.id, "service_form_published", {
        service_code: data.serviceCode,
        form_version: String(form.version),
      });
    }
    return form;
  });
