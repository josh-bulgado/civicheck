import {
  loadServiceCatalogue,
  resolveServices,
} from "~/features/services/services.catalogue";
import {
  addableUploads,
  type AddableUpload,
  type ExistingAttachment,
} from "~/features/requests/missing-uploads";

/** The documents still missing from `request`, against its service's checklist. */
export async function loadAddableUploads(
  request: { request_type: string; form_data: unknown },
  attachments: ExistingAttachment[],
): Promise<AddableUpload[]> {
  const catalogue = await loadServiceCatalogue();
  const { services, isGroup } = resolveServices(catalogue, request.request_type);
  if (services.length === 0) return [];

  // The same checklist resolution submitRequestFn applied to this request.
  const requirementKey = isGroup
    ? services[0].display_group!
    : (services[0].requirement_group ?? request.request_type);
  const service = catalogue.servicesByCode.get(request.request_type) ?? services[0];

  return addableUploads({
    requirements: catalogue.requirementsByGroup.get(requirementKey) ?? [],
    serviceCode: request.request_type,
    partyRoles: service.party_roles,
    formData: (request.form_data ?? {}) as Record<string, unknown>,
    attachments,
  });
}
