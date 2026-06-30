export interface Service {
  service_code: string;
  name: string;
  classification: string;
  fee: number;
  processing_time: string;
  steps_description: string[] | null;
  display_group: string | null;
  display_name: string | null;
  requirement_group: string | null;
}

export interface ServiceRequirement {
  id: string;
  service_code: string;
  requirement_name: string;
  is_mandatory: boolean;
  requirement_group: string | null;
  where_to_secure: string | null;
  case_tag: string | null;
}
