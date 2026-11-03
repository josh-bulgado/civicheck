import { describe, expect, it } from "vitest";
import {
  buildSummaryText,
  describeBusySeason,
  formatDays,
  formatGeneratedAt,
  pluralize,
  summarizeOffice,
  weightedAverageDays,
} from "~/features/admin/reports/report-summary";
import type {
  ServiceInsight,
  ServiceReportRow,
} from "~/features/admin/reports/service-report.queries";

function service(overrides: Partial<ServiceReportRow>): ServiceReportRow {
  return {
    key: "birth_ontime",
    label: "On-Time Registration of Certificate of Live Birth",
    departmentId: "birth",
    total: 0,
    released: 0,
    incomplete: 0,
    rejected: 0,
    pending: 0,
    walkIn: 0,
    eventDated: 0,
    avgReleaseDays: null,
    releaseSample: 0,
    asksPurpose: false,
    eventDateLabel: null,
    eventDateDirection: "past",
    ...overrides,
  };
}

const services = [
  service({ key: "a", label: "Live Birth", total: 28, released: 17, avgReleaseDays: 12.1, releaseSample: 17 }),
  service({ key: "b", label: "Marriage License", total: 5, released: 1, avgReleaseDays: 3.5, releaseSample: 1 }),
  service({ key: "c", label: "Email Inquiry", total: 3, released: 1, avgReleaseDays: 0, releaseSample: 1 }),
  service({ key: "d", label: "Death", total: 2 }),
];
const totals = { requests: 38, released: 19, incomplete: 2, rejected: 0, pending: 19 };

describe("weightedAverageDays", () => {
  it("weights each service by its releases", () => {
    // (12.1*17 + 3.5*1 + 0*1) / 19 = 11.01
    expect(weightedAverageDays(services)).toBe(11);
  });

  it("is null when nothing has been released", () => {
    expect(weightedAverageDays([service({ total: 4 })])).toBeNull();
  });

  it("counts a same-day release as zero days, not as missing", () => {
    expect(
      weightedAverageDays([service({ avgReleaseDays: 0, releaseSample: 3 })]),
    ).toBe(0);
  });
});

describe("summarizeOffice", () => {
  it("reads the totals and shares from the report", () => {
    const summary = summarizeOffice({ totals, services });
    expect(summary).toMatchObject({
      requests: 38,
      released: 19,
      open: 19,
      sentBack: 2,
      avgDays: 11,
      releaseSample: 19,
    });
    expect(summary.releasedPercent).toBe(50);
    expect(summary.sentBackPercent).toBe(5.3);
    expect(summary.topService).toMatchObject({ label: "Live Birth", count: 28 });
  });

  it("names the service behind most releases", () => {
    const { dominantRelease } = summarizeOffice({ totals, services });
    expect(dominantRelease).toMatchObject({ label: "Live Birth", count: 17 });
    expect(dominantRelease?.percent).toBe(89.5);
  });

  it("names no dominant service when releases are spread out", () => {
    const spread = [
      service({ label: "A", total: 5, avgReleaseDays: 2, releaseSample: 3 }),
      service({ label: "B", total: 5, avgReleaseDays: 4, releaseSample: 3 }),
    ];
    expect(
      summarizeOffice({ totals: { ...totals, requests: 10 }, services: spread })
        .dominantRelease,
    ).toBeNull();
  });

  it("copes with an empty period", () => {
    const summary = summarizeOffice({
      totals: { requests: 0, released: 0, incomplete: 0, rejected: 0, pending: 0 },
      services: [],
    });
    expect(summary.topService).toBeNull();
    expect(summary.avgDays).toBeNull();
    expect(summary.sentBackPercent).toBeNull();
  });
});

describe("formatDays", () => {
  it("says what the number means", () => {
    expect(formatDays(null)).toBe("—");
    expect(formatDays(0)).toBe("Same day");
    expect(formatDays(1)).toBe("1 day");
    expect(formatDays(11)).toBe("11 days");
    expect(formatDays(12.1)).toBe("12.1 days");
  });
});

describe("pluralize", () => {
  it("picks the singular only for one", () => {
    expect(pluralize(1, "request")).toBe("request");
    expect(pluralize(0, "request")).toBe("requests");
    expect(pluralize(2, "request needs", "requests need")).toBe("requests need");
  });
});

describe("buildSummaryText", () => {
  const summary = summarizeOffice({ totals, services });
  const text = buildSummaryText({
    summary,
    periodLabel: "Nov 1, 2025 – Oct 23, 2026",
    busiest: { key: "2026-08", label: "Aug 2026", count: 24, current: false },
    generatedLabel: "Oct 23, 2026, 1:29 PM",
  });

  it("states each figure on its own line", () => {
    expect(text).toContain("• 38 requests received");
    expect(text).toContain("• 19 released (50%), average 11 days");
    expect(text).toContain("• 19 still open");
    expect(text).toContain("• 2 sent back for missing papers (5.3%)");
    expect(text).toContain("Busiest month: Aug 2026 (24 requests)");
    expect(text).toContain("Most requested: Live Birth (28, 73.7%)");
  });

  it("leaves out figures that have nothing to say", () => {
    const empty = buildSummaryText({
      summary: summarizeOffice({
        totals: { requests: 0, released: 0, incomplete: 0, rejected: 0, pending: 0 },
        services: [],
      }),
      periodLabel: "Nov 1, 2025 – Oct 23, 2026",
      busiest: null,
      generatedLabel: "Oct 23, 2026, 1:29 PM",
    });
    expect(empty).toContain("• 0 requests received");
    expect(empty).not.toContain("released");
    expect(empty).not.toContain("Busiest month");
  });
});

describe("describeBusySeason", () => {
  const insight = (overrides: Partial<ServiceInsight>): ServiceInsight => ({
    serviceKey: "birth_ontime",
    sampleSize: 28,
    eventDated: 28,
    seasonality: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      count: index === 7 ? 15 : index === 8 ? 6 : 0,
    })),
    lag: {},
    sex: {},
    purpose: {},
    channel: { online: 28, walkIn: 0 },
    upcoming: [],
    ...overrides,
  });
  const selectedService = service({ eventDateLabel: "Date of birth" });

  it("names the busiest month in a sentence", () => {
    expect(describeBusySeason({ insight: insight({}), selectedService })).toBe(
      "For On-Time Registration of Certificate of Live Birth, the most common date of birth falls in August (15 of 28).",
    );
  });

  it("says nothing when too few requests recorded a date", () => {
    expect(
      describeBusySeason({ insight: insight({ eventDated: 9 }), selectedService }),
    ).toBeNull();
  });

  it("says nothing without a profiled service", () => {
    expect(describeBusySeason({ insight: insight({}), selectedService: null })).toBeNull();
  });
});

describe("formatGeneratedAt", () => {
  it("reads on the office's clock, not UTC", () => {
    expect(formatGeneratedAt("2026-10-23T05:29:00Z")).toBe("Oct 23, 2026, 1:29 PM");
    expect(formatGeneratedAt("2026-10-23T17:05:00Z")).toBe("Oct 24, 2026, 1:05 AM");
  });
});
