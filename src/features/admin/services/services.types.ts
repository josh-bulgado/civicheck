// ─── Enums (mirroring DB check constraints) ─────────────────────────────────

export type ServiceClassification = "simple" | "complex" | "highly_technical";

// ─── services_registry ───────────────────────────────────────────────────────

export interface Service {
  service_code: string;
  name: string;
  classification: ServiceClassification | null;
  fee: number;
  processing_time: string;
  steps_description: string[] | null;
  display_group: string | null;
  display_name: string | null;
  requirement_group: string | null;
  /** Owning CCRO department — what the request queue's Department column reads. */
  department_id: string | null;
}

export interface CreateServiceInput {
  service_code: string;
  name: string;
  classification: ServiceClassification;
  fee: number;
  processing_time: string;
  steps_description?: string[];
  display_group?: string | null;
  display_name?: string | null;
  requirement_group?: string | null;
  department_id?: string | null;
}

export interface UpdateServiceInput {
  name?: string;
  classification?: ServiceClassification;
  fee?: number;
  processing_time?: string;
  steps_description?: string[];
  display_group?: string | null;
  display_name?: string | null;
  requirement_group?: string | null;
  department_id?: string | null;
}

// ─── service_requirements_metadata ───────────────────────────────────────────

export interface ServiceRequirement {
  id: string;
  service_code: string | null;
  requirement_name: string;
  is_mandatory: boolean;
  requirement_group: string | null;
  where_to_secure: string | null;
  case_tag: string | null;
}

export interface CreateServiceRequirementInput {
  service_code: string;
  requirement_name: string;
  is_mandatory?: boolean;
  requirement_group?: string | null;
  where_to_secure?: string | null;
  case_tag?: string | null;
}

export interface UpdateServiceRequirementInput {
  requirement_name?: string;
  is_mandatory?: boolean;
  requirement_group?: string | null;
  where_to_secure?: string | null;
  case_tag?: string | null;
}

// ─── Combined create (service + its checklist in one call) ───────────────────

export interface CreateServiceWithRequirementsInput extends CreateServiceInput {
  requirements: Omit<CreateServiceRequirementInput, "service_code">[];
}

export interface UpdateServiceWithRequirementsInput {
  service_code: string;
  updates: UpdateServiceInput;
  requirements: Omit<CreateServiceRequirementInput, "service_code">[];
}
