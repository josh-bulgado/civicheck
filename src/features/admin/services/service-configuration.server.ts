import {
  formTemplateDefinitionSchema,
  type FormTemplateDefinition,
} from "~/features/forms/form-template.types";
import { getRequestNetworkSignal } from "~/features/system-admin/network-signal.server";
import {
  getSupabaseAdminClient,
  getSupabaseServerClient,
} from "~/utils/supabase";
import type { Service } from "./services.types";

// ─── Saving service configuration (server only) ──────────────────────────────
// The registry row, the requirement checklist, and the application form are
// written by one database function, `save_service_configuration`, so a save is
// all-or-nothing. Everything here is the application's side of that call: the
// checks that need other rows, the call itself, and the audit trail.

type ServerSupabase = ReturnType<typeof getSupabaseServerClient>;

export interface SavedForm {
  versionId: string;
  version: number;
  /** False when the definition was unchanged and no new version was needed. */
  published: boolean;
}

export interface SavedServiceConfiguration {
  service: Service;
  form: SavedForm | null;
}

type ServiceAuditEvent =
  | "service_created"
  | "service_updated"
  | "service_deleted"
  | "service_form_published";

function templateKeyForService(serviceCode: string) {
  return `service-${serviceCode.toLowerCase().replace(/[^a-z0-9_-]+/g, "-")}`;
}

/** Every service published from the same form template as `serviceCode`. */
async function loadBoundServiceCodes(
  supabase: ServerSupabase,
  serviceCode: string,
): Promise<{ templateId: string | null; codes: string[] }> {
  const { data: binding, error: bindingError } = await supabase
    .from("service_form_templates")
    .select("template_id")
    .eq("service_code", serviceCode)
    .maybeSingle();
  if (bindingError) throw new Error(bindingError.message);
  // Not bound yet: the save creates a template for this service alone.
  if (!binding) return { templateId: null, codes: [serviceCode] };

  const { data: bound, error: boundError } = await supabase
    .from("service_form_templates")
    .select("service_code")
    .eq("template_id", binding.template_id);
  if (boundError) throw new Error(boundError.message);

  return {
    templateId: binding.template_id,
    codes: (bound ?? []).map((row) => row.service_code),
  };
}

/** The form applicants are filling in today, or null when there is none. */
export async function loadLiveFormDefinition(
  supabase: ServerSupabase,
  serviceCode: string,
): Promise<FormTemplateDefinition | null> {
  const { templateId } = await loadBoundServiceCodes(supabase, serviceCode);
  if (!templateId) return null;

  const { data: template, error: templateError } = await supabase
    .from("form_templates")
    .select("active_version_id")
    .eq("id", templateId)
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template?.active_version_id) return null;

  const { data: version, error: versionError } = await supabase
    .from("form_template_versions")
    .select("definition")
    .eq("id", template.active_version_id)
    .maybeSingle();
  if (versionError) throw new Error(versionError.message);

  // A malformed published definition is ignored everywhere else too — the
  // applicant wizard falls back to the legacy form for it.
  const parsed = formTemplateDefinitionSchema.safeParse(version?.definition);
  return parsed.success ? parsed.data : null;
}

/**
 * The parts of a form that point at other services: case routing must cover
 * exactly the services published from this template, and a registration-window
 * rule must send mismatched applicants to a service card that exists.
 */
export async function assertFormFitsRegistry(
  supabase: ServerSupabase,
  serviceCode: string,
  definition: FormTemplateDefinition,
) {
  if (definition.caseSelector) {
    const { codes } = await loadBoundServiceCodes(supabase, serviceCode);
    const allowedCodes = new Set(codes);
    const outcomeCodes = new Set(
      definition.caseSelector.outcomes.map((outcome) => outcome.serviceCode),
    );
    const invalidCode = [...outcomeCodes].find(
      (code) => !allowedCodes.has(code),
    );
    if (invalidCode) {
      throw new Error(
        `Case routing outcome "${invalidCode}" is not bound to this form template.`,
      );
    }
    const missingCode = [...allowedCodes].find(
      (code) => !outcomeCodes.has(code),
    );
    if (missingCode) {
      throw new Error(
        `Case routing does not include the internal variant "${missingCode}".`,
      );
    }
  }

  if (definition.eventTiming) {
    const { data: services, error } = await supabase
      .from("services_registry")
      .select("service_code, display_group");
    if (error) throw new Error(error.message);

    // One card per display group; an ungrouped service is its own card.
    const target = definition.eventTiming.targetServiceCode;
    const exists = (services ?? []).some(
      (service) => (service.display_group ?? service.service_code) === target,
    );
    if (!exists) {
      throw new Error(
        "Choose a valid service to switch mismatched applicants to.",
      );
    }
  }
}

function describeSaveError(error: { code?: string; message: string }) {
  // PostgREST can't find the function: the migration that adds it has not been
  // applied to this database yet.
  if (error.code === "PGRST202" || error.code === "42883") {
    return "This database is missing the save_service_configuration function. Apply the latest migration, then try again.";
  }
  return error.message;
}

/**
 * Run the atomic save. `service`, `requirements`, and `form` are each optional:
 * a null part is left exactly as it is in the database.
 */
export async function runSaveServiceConfiguration(
  supabase: ServerSupabase,
  input: {
    serviceCode: string;
    create: boolean;
    service: Record<string, unknown> | null;
    requirements: Record<string, unknown>[] | null;
    form: {
      templateName: string;
      definition: FormTemplateDefinition;
      expectedVersionId: string | null;
    } | null;
  },
): Promise<SavedServiceConfiguration> {
  const { data, error } = await supabase.rpc("save_service_configuration", {
    p_service_code: input.serviceCode,
    p_create: input.create,
    p_service: input.service,
    p_requirements: input.requirements,
    p_form: input.form
      ? {
          template_key: templateKeyForService(input.serviceCode),
          template_name: input.form.templateName,
          definition: input.form.definition,
          expected_version_id: input.form.expectedVersionId,
        }
      : null,
  });
  if (error) throw new Error(describeSaveError(error));

  const result = data as {
    service: Service;
    form: { version_id: string; version: number; published: boolean } | null;
  };
  return {
    service: result.service,
    form: result.form
      ? {
          versionId: result.form.version_id,
          version: result.form.version,
          published: result.form.published,
        }
      : null,
  };
}

/**
 * Service configuration decides what applicants are told to bring, so every
 * change to it is audited. The change has already committed by the time this
 * runs, so a failed audit write is logged rather than thrown — the admin must
 * not be told that a saved change failed.
 */
export async function recordServiceAudit(
  actorId: string,
  eventType: ServiceAuditEvent,
  metadata: Record<string, string>,
) {
  try {
    const { maskedIpAddress, userAgent } = getRequestNetworkSignal();
    const { error } = await getSupabaseAdminClient()
      .from("system_audit_events")
      .insert({
        event_type: eventType,
        actor_profile_id: actorId,
        metadata,
        masked_ip_address: maskedIpAddress,
        user_agent: userAgent,
      });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(`Failed to write the ${eventType} audit event`, error);
  }
}
