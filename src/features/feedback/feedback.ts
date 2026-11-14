import { z } from "zod";

export const SATISFACTION_LABELS = [
  "Very dissatisfied",
  "Dissatisfied",
  "Neither satisfied nor dissatisfied",
  "Satisfied",
  "Very satisfied",
] as const;
export const EASE_LABELS = [
  "Very difficult",
  "Difficult",
  "Neither easy nor difficult",
  "Easy",
  "Very easy",
] as const;
export const FEEDBACK_TOPICS = {
  application_form: "Application form",
  requirements: "Requirements",
  uploads: "Document uploads",
  status_updates: "Status updates",
  notifications: "Notifications",
  other: "Other",
} as const;
export const PROBLEM_CATEGORIES = {
  application_form: "Application form",
  uploads: "Document uploads",
  request_tracking: "Request tracking",
  notifications: "Notifications",
  other: "Other",
} as const;
export const FEEDBACK_STATUSES = {
  new: "New",
  reviewed: "Reviewed",
  needs_action: "Needs action",
} as const;
export const PROBLEM_STATUSES = {
  new: "New",
  under_review: "Under review",
  resolved: "Resolved",
} as const;
export const feedbackTopicSchema = z.enum([
  "application_form",
  "requirements",
  "uploads",
  "status_updates",
  "notifications",
  "other",
]);
export const problemCategorySchema = z.enum([
  "application_form",
  "uploads",
  "request_tracking",
  "notifications",
  "other",
]);
const ratingSchema = z.number().int().min(1).max(5);
export const submitFeedbackSchema = z.object({
  requestId: z.string().uuid(),
  rating: ratingSchema,
  easeRating: ratingSchema.nullable().default(null),
  topics: z
    .array(feedbackTopicSchema)
    .max(6)
    .transform((topics) => [...new Set(topics)])
    .default([]),
  comment: z.string().trim().max(2000).default(""),
});
export const submitProblemSchema = z.object({
  requestId: z.string().uuid().nullable().default(null),
  category: problemCategorySchema,
  description: z
    .string()
    .trim()
    .min(1, "Describe the problem so we can investigate.")
    .max(2000),
  pagePath: z
    .string()
    .max(500)
    .refine(
      (path) => path === "" || /^\/[^?#]*$/.test(path),
      "Use a page path without query parameters.",
    )
    .default(""),
});
export const reviewSubmissionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("feedback"),
    id: z.string().uuid(),
    status: z.enum(["new", "reviewed", "needs_action"]),
  }),
  z.object({
    kind: z.literal("problem"),
    id: z.string().uuid(),
    status: z.enum(["new", "under_review", "resolved"]),
  }),
]);
const dateSchema = z.string().refine((value) => {
  if (value === "") return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}, "Choose a valid date.");
export const reviewFiltersSchema = z
  .object({
    tab: z.enum(["feedback", "problems"]).default("feedback"),
    service: z.string().max(100).default(""),
    from: dateSchema.default(""),
    until: dateSchema.default(""),
    page: z.number().int().min(1).max(100000).default(1),
  })
  .refine(
    (value) => !value.from || !value.until || value.from <= value.until,
    "The end date must be on or after the start date.",
  );
export type ReviewFilters = z.infer<typeof reviewFiltersSchema>;
export type FeedbackTopic = keyof typeof FEEDBACK_TOPICS;
export type ProblemCategory = keyof typeof PROBLEM_CATEGORIES;
export type FeedbackStatus = keyof typeof FEEDBACK_STATUSES;
export type ProblemStatus = keyof typeof PROBLEM_STATUSES;
export interface RequestFeedback {
  id: string;
  rating: number;
  ease_rating: number | null;
  topics: FeedbackTopic[];
  comment: string;
  created_at: string;
}
export interface ReviewItem {
  id: string;
  kind: "feedback" | "problem";
  reference: string;
  requestId: string | null;
  serviceName: string;
  createdAt: string;
  rating: number | null;
  easeRating: number | null;
  topics: string[];
  body: string;
  category: string | null;
  pagePath: string | null;
  status: FeedbackStatus | ProblemStatus;
}
export interface FeedbackSummary {
  total: number;
  satisfied: number;
  distribution: number[];
}
export function problemReference(number: number | string) {
  return `PR-${String(number).padStart(6, "0")}`;
}
export function satisfactionPercent(
  summary: Pick<FeedbackSummary, "total" | "satisfied">,
) {
  return summary.total
    ? Math.round((summary.satisfied / summary.total) * 100)
    : null;
}
export function filterDateBounds(
  filters: Pick<ReviewFilters, "from" | "until">,
) {
  return {
    from: filters.from ? `${filters.from}T00:00:00+08:00` : null,
    until: filters.until
      ? new Date(
          new Date(`${filters.until}T00:00:00+08:00`).getTime() + 86400000,
        ).toISOString()
      : null,
  };
}
