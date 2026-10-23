import { describe, expect, it } from "vitest";
import {
  bucketRequestVolume,
  busiestBucket,
  volumeRows,
} from "~/features/admin/reports/report-volume";

// 1:29 pm in Legazpi on Oct 23, 2026.
const NOW = new Date("2026-10-23T05:29:00Z");

describe("bucketRequestVolume", () => {
  it("returns one bucket per month, oldest first, ending with the current one", () => {
    const buckets = bucketRequestVolume([], 6, NOW);
    expect(buckets.map((b) => b.label)).toEqual([
      "May 2026",
      "Jun 2026",
      "Jul 2026",
      "Aug 2026",
      "Sep 2026",
      "Oct 2026",
    ]);
    expect(buckets.filter((b) => b.current).map((b) => b.label)).toEqual(["Oct 2026"]);
  });

  it("counts requests on the Philippine calendar, not UTC", () => {
    const buckets = bucketRequestVolume(
      [
        "2026-08-15T03:00:00Z",
        // 1:00 am on Oct 1 in Legazpi, still Sep 30 in UTC.
        "2026-09-30T17:00:00Z",
        "2026-10-02T01:00:00Z",
      ],
      6,
      NOW,
    );
    const counts = Object.fromEntries(buckets.map((b) => [b.label, b.count]));
    expect(counts["Aug 2026"]).toBe(1);
    expect(counts["Sep 2026"]).toBe(0);
    expect(counts["Oct 2026"]).toBe(2);
  });

  it("includes the first minute of the period and leaves out the minute before", () => {
    const buckets = bucketRequestVolume(
      ["2026-04-30T16:00:00Z", "2026-04-30T15:59:00Z"],
      6,
      NOW,
    );
    expect(buckets[0].label).toBe("May 2026");
    expect(buckets[0].count).toBe(1);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(1);
  });

  it("ignores unreadable timestamps", () => {
    const buckets = bucketRequestVolume(["not a date"], 6, NOW);
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  it("groups three years into quarters", () => {
    const buckets = bucketRequestVolume(["2026-10-02T01:00:00Z"], 36, NOW);
    expect(buckets[0].label).toBe("Q4 2023");
    expect(buckets[buckets.length - 1].label).toBe("Q4 2026");
    expect(buckets[buckets.length - 1].count).toBe(1);
    expect(buckets).toHaveLength(13);
  });
});

describe("busiestBucket", () => {
  it("is null when nothing was requested", () => {
    expect(busiestBucket(bucketRequestVolume([], 6, NOW))).toBeNull();
  });

  it("picks the earliest of equally busy buckets", () => {
    const buckets = bucketRequestVolume(
      ["2026-08-15T03:00:00Z", "2026-10-02T01:00:00Z"],
      6,
      NOW,
    );
    expect(busiestBucket(buckets)?.label).toBe("Aug 2026");
  });
});

describe("volumeRows", () => {
  const stamps = [
    ...Array<string>(24).fill("2026-08-15T03:00:00Z"),
    ...Array<string>(2).fill("2026-09-10T03:00:00Z"),
    ...Array<string>(21).fill("2026-10-05T03:00:00Z"),
  ];

  it("collapses a long empty start into one line", () => {
    const rows = volumeRows(bucketRequestVolume(stamps, 12, NOW));
    expect(rows[0]).toMatchObject({ gap: true, label: "Nov 2025 to Jul 2026" });
    expect(rows.map((r) => r.label)).toEqual([
      "Nov 2025 to Jul 2026",
      "Aug 2026",
      "Sep 2026",
      "Oct 2026",
    ]);
  });

  it("keeps a short empty start as ordinary rows", () => {
    // Only May is empty before the first request in June: not worth a summary line.
    const short = volumeRows(
      bucketRequestVolume(["2026-06-10T03:00:00Z", ...stamps], 6, NOW),
    );
    expect(short.some((r) => r.gap)).toBe(false);
    expect(short).toHaveLength(6);
  });

  it("marks the busiest bucket and the current one", () => {
    const rows = volumeRows(bucketRequestVolume(stamps, 6, NOW));
    expect(rows.filter((r) => r.busiest).map((r) => r.label)).toEqual(["Aug 2026"]);
    expect(rows.filter((r) => r.current).map((r) => r.label)).toEqual(["Oct 2026"]);
  });

  it("keeps every row when the whole period is empty", () => {
    const rows = volumeRows(bucketRequestVolume([], 6, NOW));
    expect(rows).toHaveLength(6);
    expect(rows.some((r) => r.gap || r.busiest)).toBe(false);
  });
});
