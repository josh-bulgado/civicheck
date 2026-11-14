import { expect, it } from "vitest";
import { parseFormTemplateDefinition } from "~/features/forms/form-template.utils";
import { emptySubject } from "~/lib/subject-fields";
import previousForm from "./fixtures/supplemental-walk-in-form.json";
import { walkInCaseForService } from "./walk-in-legitimation";
import { prepareWalkInSupplemental } from "./walk-in-supplemental";

const definition = parseFormTemplateDefinition(previousForm);
definition.sections.find(section => section.step === "details")!.fields.push(
  ...["first", "middle", "last"].map(part => ({
    key: `wife_${part}_name`, type: "text" as const, label: `Wife's ${part} name`, required: true, inline: true,
    ...(part === "middle" ? { noneLabel: "No middle name" } : {}),
    visibleWhen: { field: "record_type", operator: "equals" as const, value: "marriage" },
  })),
);
const walkIn = walkInCaseForService(definition, "SUPPLEMENTAL_REPORT").definition;
const subjects = [{ ...emptySubject("Subject"), firstName: "Juan", middleName: "Santos", lastName: "Cruz" }];
const answers = {
  subjects, record_type: "marriage", event_date: "2000-01-01", event_place: "Legazpi City",
  entry_to_supplement: "Citizenship", information_to_add: "Filipino",
  wife_first_name: "Ana", wife_middle_name: "N/A", wife_last_name: "Reyes",
};

it("retains and saves both spouses' manually entered names", () => {
  const result = prepareWalkInSupplemental(walkIn, answers, ["Subject"]);
  expect(result.error).toBe(false);
  if (result.error) return;
  expect(result.formData).toMatchObject({ subject_first_name: "Juan", wife_first_name: "Ana", wife_middle_name: "N/A", wife_last_name: "Reyes" });
});

it.each(["wife_first_name", "wife_middle_name", "wife_last_name"])("requires %s for a marriage record", key => {
  expect(prepareWalkInSupplemental(walkIn, { ...answers, [key]: "" }, ["Subject"]).error).toBe(true);
});

it("does not require a wife's name for a death record", () => {
  expect(prepareWalkInSupplemental(walkIn, {
    ...answers, record_type: "death", wife_first_name: "", wife_middle_name: "", wife_last_name: "",
  }, ["Subject"]).error).toBe(false);
});
