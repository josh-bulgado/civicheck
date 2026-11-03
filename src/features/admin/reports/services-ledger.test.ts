import { describe, expect, it } from "vitest";
import { ALL_DEPARTMENTS } from "~/features/admin/department-filter";
import {
  countByDepartment,
  matchesServiceDepartment,
  matchesServiceSearch,
  servicesToCsv,
} from "~/features/admin/reports/services-ledger";
import type { ServiceReportRow } from "~/features/admin/reports/service-report.queries";

const row = (overrides: Partial<ServiceReportRow>): ServiceReportRow => ({
  key: "birth_ontime",
  label: "On-Time Registration of Certificate of Live Birth",
  departmentId: "birth",
  total: 28,
  released: 17,
  incomplete: 1,
  rejected: 0,
  pending: 11,
  walkIn: 0,
  eventDated: 28,
  avgReleaseDays: 12.1,
  releaseSample: 17,
  asksPurpose: false,
  eventDateLabel: "Date of birth",
  eventDateDirection: "past",
  ...overrides,
});

const rows = [
  row({}),
  row({ key: "marriage_license", label: "Application and Issuance of Marriage License", departmentId: "marriage" }),
  row({ key: "ctc", label: "Certified True/Xerox Copies", departmentId: "archives" }),
  row({ key: "death_delayed", label: "Delayed Registration of Certificate of Death", departmentId: null }),
];

describe("matchesServiceSearch", () => {
  it("matches the name, the key or the department, in any case", () => {
    expect(matchesServiceSearch(rows[1], "MARRIAGE")).toBe(true);
    expect(matchesServiceSearch(rows[0], "birth_ontime")).toBe(true);
    expect(matchesServiceSearch(rows[2], "archives")).toBe(true);
    expect(matchesServiceSearch(rows[2], "marriage")).toBe(false);
  });

  it("matches everything when the box is empty or blank", () => {
    expect(matchesServiceSearch(rows[0], "")).toBe(true);
    expect(matchesServiceSearch(rows[0], "   ")).toBe(true);
  });
});

describe("matchesServiceDepartment", () => {
  it("keeps only the chosen department, or everything for 'all'", () => {
    expect(matchesServiceDepartment(rows[0], ALL_DEPARTMENTS)).toBe(true);
    expect(matchesServiceDepartment(rows[0], "birth")).toBe(true);
    expect(matchesServiceDepartment(rows[0], "death")).toBe(false);
    expect(matchesServiceDepartment(rows[3], "birth")).toBe(false);
  });
});

describe("countByDepartment", () => {
  it("counts every service under 'all' and each department under its own id", () => {
    expect(countByDepartment(rows, "")).toEqual({
      [ALL_DEPARTMENTS]: 4,
      birth: 1,
      marriage: 1,
      archives: 1,
    });
  });

  it("counts only what the search leaves", () => {
    expect(countByDepartment(rows, "certificate")).toEqual({
      [ALL_DEPARTMENTS]: 2,
      birth: 1,
    });
  });
});

describe("servicesToCsv", () => {
  it("writes one line per service with plain-language days", () => {
    const csv = servicesToCsv(
      [row({}), row({ key: "ctc", label: "Copies, certified", avgReleaseDays: null, releaseSample: 0 })],
      (id) => (id ? id.toUpperCase() : "Unassigned"),
    );
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(lines[0]).toBe(
      "Service,Department,Requests,Released,Average days to release,Sent back,Still open,Rejected,Walk-in",
    );
    expect(lines[1]).toBe(
      "On-Time Registration of Certificate of Live Birth,BIRTH,28,17,12.1 days,1,11,0,0",
    );
    expect(lines[2]).toBe('"Copies, certified",BIRTH,28,17,,1,11,0,0');
  });
});
