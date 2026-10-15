import { createServerFn } from "@tanstack/react-start";
import { requirePermission } from "~/middleware/auth";
import { buildLegacyFormDefinition } from "~/features/forms/form-template.utils";
import { invalidateServiceCatalogue } from "~/features/services/services.catalogue";
import {
  assertFormFitsRegistry,
  loadLiveFormDefinition,
  recordServiceAudit,
  runSaveServiceConfiguration,
} from "./service-configuration.server";
import {
  findRequirementIssue,
  saveServiceConfigurationSchema,
  type SaveServiceConfigurationInput,
} from "./service-configuration.schema";
import type {
  CreateServiceInput,
  UpdateServiceInput,
  CreateServiceRequirementInput,
  UpdateServiceRequirementInput,
  Service,
  ServiceRequirement,
} from "./services.types";

// ─── services_registry mutations ─────────────────────────────────────────────

export const createService = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: CreateServiceInput) => d)
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("services_registry")
      .insert(data)
      .select()
      .single();

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return created as Service;
  });

export const updateService = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: { service_code: string; updates: UpdateServiceInput }) => d)
  .handler(async ({ data: { service_code, updates }, context }) => {
    const { data: updated, error } = await context.supabase
      .from("services_registry")
      .update(updates)
      .eq("service_code", service_code)
      .select()
      .single();

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return updated as Service;
  });

/**
 * Save a service's whole configuration — registry row, requirement checklist,
 * and application form — as one all-or-nothing change.
 *
 * This is what the admin service editor calls, for both a new service and an
 * edit. The three parts are written by a single database function
 * (`save_service_configuration`), because they only make sense together: a
 * checklist condition names a question in the form, and applicants must never
 * be shown one without the other.
 *
 * Checklist rows are matched by id, so editing a service keeps the documents
 * applicants already uploaded attached to their requirement. The form is only
 * republished when it actually changed.
 *
 * `service_code` is never changed by an edit: `requests.request_type` references
 * it with ON DELETE RESTRICT, so it is the stable identity of the service.
 *
 * A save edits the checklist for the whole `requirement_group`. Where several
 * services share a group, all of them are affected — the editor warns first.
 */
export const saveServiceConfiguration = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((input: SaveServiceConfigurationInput) => {
    const parsed = saveServiceConfigurationSchema.safeParse(input);
    if (!parsed.success) {
      // The editor shows this message as-is, so name the field it is about.
      const issue = parsed.error.issues[0];
      throw new Error(
        issue
          ? `${issue.path.join(".")}: ${issue.message}`
          : "Check the service details.",
      );
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    const { serviceCode, service, form } = data;
    const isCreate = data.mode === "create";

    const seenIds = new Set<string>();
    const requirements = data.requirements.map((requirement) => {
      // An id may only be claimed once: a second row carrying it is a copy the
      // editor made of the first (a per-variant override), so it is a new row.
      const id =
        requirement.id && !seenIds.has(requirement.id) ? requirement.id : null;
      if (id) seenIds.add(id);

      const isSubjectScoped =
        requirement.requires_upload &&
        requirement.upload_scope === "specific_subject";
      return {
        id,
        requirement_name: requirement.requirement_name,
        where_to_secure: requirement.where_to_secure,
        case_tag: requirement.case_tag,
        applies_when: requirement.applies_when,
        is_mandatory: requirement.is_mandatory,
        requires_upload: requirement.requires_upload,
        upload_scope: requirement.requires_upload
          ? requirement.upload_scope
          : ("request" as const),
        subject_role: isSubjectScoped ? requirement.subject_role : null,
      };
    });

    // Conditions are checked against the form applicants will actually see: the
    // one being published, or — on a variant-only save, which leaves the form
    // alone — the one that is already live.
    const definition =
      form?.definition ??
      (isCreate
        ? null
        : await loadLiveFormDefinition(context.supabase, serviceCode)) ??
      buildLegacyFormDefinition({ service_code: serviceCode, ...service });
    const requirementIssue = findRequirementIssue(
      definition,
      requirements,
      service.party_roles,
    );
    if (requirementIssue) throw new Error(requirementIssue);

    if (form) {
      await assertFormFitsRegistry(context.supabase, serviceCode, form.definition);
    }

    const saved = await runSaveServiceConfiguration(context.supabase, {
      serviceCode,
      create: isCreate,
      service,
      requirements,
      form,
    });

    invalidateServiceCatalogue();
    await recordServiceAudit(
      context.user.id,
      isCreate ? "service_created" : "service_updated",
      {
        service_code: serviceCode,
        requirement_count: String(requirements.length),
        ...(saved.form
          ? {
              form_version: String(saved.form.version),
              form_published: String(saved.form.published),
            }
          : {}),
      },
    );

    return saved;
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: string) => d)
  .handler(async ({ data: service_code, context }) => {
    const { error } = await context.supabase
      .from("services_registry")
      .delete()
      .eq("service_code", service_code);

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    await recordServiceAudit(context.user.id, "service_deleted", {
      service_code,
    });
    return { success: true, service_code };
  });

// ─── service_requirements_metadata mutations ─────────────────────────────────

export const createServiceRequirement = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: CreateServiceRequirementInput) => d)
  .handler(async ({ data, context }) => {
    const { data: created, error } = await context.supabase
      .from("service_requirements_metadata")
      .insert({
        ...data,
        is_mandatory: data.is_mandatory ?? true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return created as ServiceRequirement;
  });

export const updateServiceRequirement = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: { id: string; updates: UpdateServiceRequirementInput }) => d)
  .handler(async ({ data: { id, updates }, context }) => {
    const { data: updated, error } = await context.supabase
      .from("service_requirements_metadata")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return updated as ServiceRequirement;
  });

export const deleteServiceRequirement = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: string) => d)
  .handler(async ({ data: id, context }) => {
    const { error } = await context.supabase
      .from("service_requirements_metadata")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return { success: true, id };
  });

export const deleteServiceRequirementsByServiceCode = createServerFn({ method: "POST" })
  .middleware([requirePermission("services:manage")])
  .validator((d: string) => d)
  .handler(async ({ data: service_code, context }) => {
    const { error } = await context.supabase
      .from("service_requirements_metadata")
      .delete()
      .eq("service_code", service_code);

    if (error) throw new Error(error.message);

    invalidateServiceCatalogue();
    return { success: true, service_code };
  });
