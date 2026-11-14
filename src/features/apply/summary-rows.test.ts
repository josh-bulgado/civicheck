import { expect, it } from "vitest";
import { buildSummaryRows } from "./summary-rows";
import { emptySubject } from "~/lib/subject-fields";
import type { FormTemplateDefinition } from "~/features/forms/form-template.types";

const definition: FormTemplateDefinition = {
  schemaVersion: 1,
  sections: [{ key: "details", title: "Details", step: "details", fields:
    ["event_date", "event_place", "place_type", "father_last_name", "father_middle_name", "father_first_name"].map(key => ({ key, label: key, type: "text", required: false })),
  }],
};
const subjects = [
  { ...emptySubject("Child"), firstName: "Ana", sex: "female" },
  { ...emptySubject("Mother"), firstName: "Maria" },
];
const answers = { event_date: "2026-11-01", event_place: "Legazpi", place_type: "Home", father_first_name: "Juan", father_middle_name: "Santos", father_last_name: "Cruz" };

it.each(["BIRTH_ONTIME", "OTCOLB-MARITAL", "OTCOLB-NONMARITAL"])("orders the summary and combines the father name for %s", serviceCode => {
  const rows = buildSummaryRows({ definition, subjects, answers, serviceCode });
  expect(rows.map(row => row.label)).toEqual(["Child", "Sex", "event_date", "event_place", "place_type", "Mother", "Father"]);
  expect(rows.at(-1)?.value).toBe("Juan Santos Cruz");
});

it("keeps other services' summary fields separate", () => {
  const rows = buildSummaryRows({ definition, subjects, answers, serviceCode: "BIRTH_DELAYED" });
  expect(rows.slice(-3).map(row => row.label)).toEqual(["father_last_name", "father_middle_name", "father_first_name"]);
});
