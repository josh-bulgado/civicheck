import type { RequestServiceName } from "~/features/requests/applicant-requests.queries";

/** A row from `getMyRequestsFn` as consumed by the applicant dashboard. */
export interface CitizenDashboardRequest {
  id: string;
  tracking_number: string | null;
  request_type: string | null;
  status: string;
  payment_status: string | null;
  created_at: string;
  fees_due: number | string | null;
  /** The service the request is for; `getMyRequestsFn` flattens the embed to one object. */
  services_registry?: RequestServiceName | null;
  /** The service's short name, when an admin set one. */
  short_name?: string | null;
  /** Every status change on the request, in no particular order. */
  application_logs?: { action_status: string; created_at: string }[] | null;
}

export interface AttentionItem {
  request: CitizenDashboardRequest;
  tone: "warning" | "success";
  message: string;
  action: string;
}
