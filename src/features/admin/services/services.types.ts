// ─── Enums (mirroring DB check constraints) ─────────────────────────────────

export type ServiceClassification = "simple" | "complex" | "highly_technical";
export type EventDateDirection = "past" | "future" | "any";

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
  /** Who the intake form asks about, e.g. ["Subject"] or ["Bride", "Groom"]. */
  party_roles: string[];
  /** Falls back to "Date of event" / "Place of event" in the apply wizard when null. */
  event_date_label: string | null;
  event_place_label: string | null;
  /** Whether the case step's date picker allows past, future, or any date. */
  event_date_direction: EventDateDirection;
  /** When set, the apply wizard shows an optional reference-number field with this label. */
  reference_number_label: string | null;
  /** Whether the case step asks "Purpose of request" — only relevant for services that hand over a copy of an existing record. */
  asks_purpose: boolean;
  /** Whether the case step asks for the informant and whether birth was at a hospital or at home. */
  asks_birth_details: boolean;
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
  party_roles?: string[];
  event_date_label?: string | null;
  event_place_label?: string | null;
  event_date_direction?: EventDateDirection;
  reference_number_label?: string | null;
  asks_purpose?: boolean;
  asks_birth_details?: boolean;
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
  party_roles?: string[];
  event_date_label?: string | null;
  event_place_label?: string | null;
  event_date_direction?: EventDateDirection;
  reference_number_label?: string | null;
  asks_purpose?: boolean;
  asks_birth_details?: boolean;
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
