import {
  ATTENTION_SHOWN,
  OTHER_REQUESTS_SHOWN,
  heroLead,
  leadCaptions,
  trackerDetails,
  trackerProgress,
  type DashboardPlan,
} from "./hero";

/**
 * The outline of the applicant dashboard, with none of its content: enough for
 * a loading skeleton to be drawn in the same formation as the page it stands in
 * for, so the swap moves nothing.
 *
 * `empty` is the "What do you need today?" page of an applicant with no
 * requests. `requests` is the page led by the request needing them most: its
 * card (`null` when nothing is in progress), how many "needs your attention"
 * and "other requests" rows sit under it, all counted the way the page does.
 */
export type DashboardShape =
  | { kind: "empty" }
  | {
      kind: "requests";
      hero: {
        /** Submitted and processing add a line under the headline. */
        lead: boolean;
        /** Tracker stages already finished, 0 to 4 (all four once released). */
        done: number;
        /** Stages with a line of text under their label, counted from the first. */
        captioned: number;
        /** A pill under the stage the request is in ("Action needed", "Pay at cashier"). */
        tag: boolean;
      } | null;
      attention: number;
      rows: number;
    };

/** What a skeleton draws when nothing is known: a new account's own page. */
export const EMPTY_SHAPE: DashboardShape = { kind: "empty" };

export function dashboardShape(
  hasRequests: boolean,
  plan: DashboardPlan,
): DashboardShape {
  if (!hasRequests) return EMPTY_SHAPE;

  const { hero } = plan;
  const details = hero ? trackerDetails(hero) : null;
  return {
    kind: "requests",
    hero:
      hero && details
        ? {
            lead: heroLead(hero.status, "") !== null,
            // The same count the tracker draws.
            done: trackerProgress(hero.status).done,
            captioned: Object.keys(leadCaptions(hero, details)).length,
            tag: details.tag !== null,
          }
        : null,
    attention: plan.attention.length,
    rows: plan.rows.length,
  };
}

const KEY_PREFIX = "civicheck.dashboard-shape.";

function inRange(value: unknown, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;
}

/** A stored value is only trusted if every part of it is in range. */
export function parseDashboardShape(value: unknown): DashboardShape | null {
  if (typeof value !== "object" || value === null) return null;
  const shape = value as Record<string, unknown>;

  if (shape.kind === "empty") return EMPTY_SHAPE;
  if (shape.kind !== "requests") return null;
  if (!inRange(shape.attention, ATTENTION_SHOWN)) return null;
  if (!inRange(shape.rows, OTHER_REQUESTS_SHOWN)) return null;

  const { hero } = shape;
  if (hero === null) {
    return { kind: "requests", hero: null, attention: shape.attention, rows: shape.rows };
  }
  if (typeof hero !== "object") return null;
  const { lead, done, captioned, tag } = hero as Record<string, unknown>;
  if (typeof lead !== "boolean" || typeof tag !== "boolean") return null;
  if (!inRange(done, 4) || !inRange(captioned, 4)) return null;

  return {
    kind: "requests",
    hero: { lead, done, captioned, tag },
    attention: shape.attention,
    rows: shape.rows,
  };
}

// Browser storage can be missing or throw (private windows, blocked site
// data), and the shape is only a hint, so every failure just means "unknown".
function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** What this person's dashboard last looked like on this device, if it is known. */
export function readDashboardShape(userId: string): DashboardShape | null {
  try {
    const raw = storage()?.getItem(KEY_PREFIX + userId);
    return raw ? parseDashboardShape(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Kept per person, so the next sign-in on this device starts from the right outline. */
export function rememberDashboardShape(userId: string, shape: DashboardShape): void {
  try {
    storage()?.setItem(KEY_PREFIX + userId, JSON.stringify(shape));
  } catch {
    // The skeleton just falls back to the default next time.
  }
}
