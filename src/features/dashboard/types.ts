/** A row from `getMyRequestsFn` as consumed by the applicant dashboard. */
export interface CitizenDashboardRequest {
  id: string;
  tracking_number: string | null;
  request_type: string | null;
  status: string;
  payment_status: string | null;
  created_at: string;
  fees_due: number | string | null;
  /**
   * Supabase's inferred embed type is an array, but the to-one select returns a
   * single object at runtime — kept loose to match the row as consumed here.
   */
  services_registry?: any;
}

export interface AttentionItem {
  request: CitizenDashboardRequest;
  tone: "warning" | "success";
  message: string;
  action: string;
}
