import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireActiveSession } from "~/server/auth";
import { one } from "~/lib/embed";
import {
  filterDateBounds,
  problemReference,
  reviewFiltersSchema,
  reviewSubmissionSchema,
  submitFeedbackSchema,
  submitProblemSchema,
  type FeedbackSummary,
  type FeedbackStatus,
  type ProblemStatus,
  type ReviewItem,
  type RequestFeedback,
} from "./feedback";
import { readRequestFeedback } from "./feedback.server";

export const submitRequestFeedbackFn = createServerFn({ method: "POST" })
  .validator(submitFeedbackSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("id, status")
      .eq("id", data.requestId)
      .eq("applicant_id", user.id)
      .maybeSingle();
    if (requestError || !request || request.status !== "released") {
      return {
        error: true as const,
        message: "Feedback is available after your request has been completed.",
      };
    }
    const { data: feedback, error } = await supabase
      .from("request_feedback")
      .insert({
        request_id: request.id,
        applicant_id: user.id,
        rating: data.rating,
        ease_rating: data.easeRating,
        topics: data.topics,
        comment: data.comment,
      })
      .select("id, rating, ease_rating, topics, comment, created_at")
      .single();
    if (error?.code === "23505") {
      const existing = await readRequestFeedback(supabase, request.id);
      if (existing) return { error: false as const, feedback: existing };
    }
    if (error || !feedback)
      return {
        error: true as const,
        message: "Your feedback could not be saved. Please try again.",
      };
    return { error: false as const, feedback: feedback as RequestFeedback };
  });

export const submitProblemReportFn = createServerFn({ method: "POST" })
  .validator(submitProblemSchema)
  .handler(async ({ data }) => {
    const { supabase, user } = await requireActiveSession("requests:view_own");
    if (data.requestId) {
      const { data: request, error } = await supabase
        .from("requests")
        .select("id")
        .eq("id", data.requestId)
        .eq("applicant_id", user.id)
        .maybeSingle();
      if (error || !request)
        return {
          error: true as const,
          message:
            "That request is not available. Reopen your request and try again.",
        };
    }
    const { data: report, error } = await supabase
      .from("problem_reports")
      .insert({
        applicant_id: user.id,
        request_id: data.requestId,
        category: data.category,
        description: data.description,
        page_path: data.pagePath,
      })
      .select("id, reference_number")
      .single();
    if (error || !report)
      return {
        error: true as const,
        message:
          error?.code === "P0001"
            ? error.message
            : "Your report could not be saved. Please try again.",
      };
    return {
      error: false as const,
      reference: problemReference(report.reference_number),
    };
  });

export const updateSubmissionReviewFn = createServerFn({ method: "POST" })
  .validator(reviewSubmissionSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    const table =
      data.kind === "feedback" ? "request_feedback" : "problem_reports";
    const { data: row, error } = await supabase
      .from(table)
      .update({ review_status: data.status })
      .eq("id", data.id)
      .select("id, review_status")
      .maybeSingle();
    if (error || !row)
      return {
        error: true as const,
        message: "The review could not be saved. Refresh and try again.",
      };
    return { error: false as const };
  });

type EmbeddedRequest = {
  id: string;
  tracking_number: string;
  request_type: string;
  services_registry:
    | { name: string; display_name: string | null }
    | { name: string; display_name: string | null }[]
    | null;
};
type FeedbackRow = RequestFeedback & {
  request_id: string;
  review_status: FeedbackStatus;
  requests: EmbeddedRequest | EmbeddedRequest[] | null;
};
type ProblemRow = {
  id: string;
  reference_number: number;
  request_id: string | null;
  category: string;
  description: string;
  page_path: string;
  review_status: ProblemStatus;
  created_at: string;
  requests: EmbeddedRequest | EmbeddedRequest[] | null;
};
function requestDetails(embed: FeedbackRow["requests"]) {
  const request = one<EmbeddedRequest>(embed);
  const service = one<{ name: string; display_name: string | null }>(
    request?.services_registry,
  );
  return {
    request,
    serviceName:
      service?.display_name ||
      service?.name ||
      request?.request_type ||
      "General system report",
  };
}

export const getAdminFeedbackFn = createServerFn({ method: "GET" })
  .validator(reviewFiltersSchema)
  .handler(async ({ data }) => {
    const { supabase } = await requireActiveSession("dashboard:admin");
    setResponseHeader("Cache-Control", "no-store");
    const bounds = filterDateBounds(data);
    const relation = `requests${data.tab === "feedback" || data.service ? "!inner" : ""}(id, tracking_number, request_type, services_registry(name, display_name))`;
    const select =
      data.tab === "feedback"
        ? `id, request_id, rating, ease_rating, topics, comment, review_status, created_at, ${relation}`
        : `id, reference_number, request_id, category, description, page_path, review_status, created_at, ${relation}`;
    let query = supabase
      .from(data.tab === "feedback" ? "request_feedback" : "problem_reports")
      .select(select, { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id");
    if (bounds.from) query = query.gte("created_at", bounds.from);
    if (bounds.until) query = query.lt("created_at", bounds.until);
    if (data.service) query = query.eq("requests.request_type", data.service);
    const pageSize = 20;
    const [list, summary, services] = await Promise.all([
      query.range((data.page - 1) * pageSize, data.page * pageSize - 1),
      supabase.rpc("citizen_feedback_summary", {
        p_from: bounds.from,
        p_until: bounds.until,
        p_service: data.service || null,
      }),
      supabase
        .from("services_registry")
        .select("service_code, name, display_name")
        .order("name"),
    ]);
    if (list.error || summary.error || services.error)
      throw new Error(
        "Feedback and reports could not be loaded. Please try again.",
      );
    const items: ReviewItem[] =
      data.tab === "feedback"
        ? ((list.data as unknown as FeedbackRow[]) ?? []).map((row) => {
            const { request, serviceName } = requestDetails(row.requests);
            return {
              id: row.id,
              kind: "feedback",
              reference: request?.tracking_number || "Completed request",
              requestId: row.request_id,
              serviceName,
              createdAt: row.created_at,
              rating: row.rating,
              easeRating: row.ease_rating,
              topics: row.topics,
              body: row.comment,
              category: null,
              pagePath: null,
              status: row.review_status,
            };
          })
        : ((list.data as unknown as ProblemRow[]) ?? []).map((row) => ({
            id: row.id,
            kind: "problem",
            reference: problemReference(row.reference_number),
            requestId: row.request_id,
            serviceName: requestDetails(row.requests).serviceName,
            createdAt: row.created_at,
            rating: null,
            easeRating: null,
            topics: [],
            body: row.description,
            category: row.category,
            pagePath: row.page_path,
            status: row.review_status,
          }));
    return {
      items,
      count: list.count ?? 0,
      pageSize,
      summary: summary.data as unknown as FeedbackSummary,
      services: (services.data ?? []).map((service) => ({
        code: service.service_code as string,
        name: (service.display_name || service.name) as string,
      })),
    };
  });

export type AdminFeedbackData = Awaited<ReturnType<typeof getAdminFeedbackFn>>;
