import { expect, it } from "vitest";
import { canonicalizeTemplateAnswers, parseFormTemplateDefinition } from "./form-template.utils";
import { staffCopy, staffFormDefinition } from "./staff-copy";

it.each([
  ["What do you need?", "Endorsement type"],
  ["Which record is it for?", "Record type"],
  ["Your details", "Applicant's information"],
  ["Are you currently employed?", "Is the applicant currently employed?"],
  ["I am the document owner", "Document owner"],
  ["I don't have a middle name", "No middle name"],
  ["I am not sure", "Not sure"],
  ["Yes, I have an employer", "Yes, the applicant has an employer"],
  ["Blurred or illegible entries: my PSA copy has unreadable entries", "Blurred or illegible entries: the PSA copy has unreadable entries"],
  ["Your relationship to the child", "Applicant's relationship to the child"],
])("uses the staff's point of view for %s", (original, expected) => {
  expect(staffCopy(original)).toBe(expected);
});

it("keeps first-person staff confirmations", () => {
  for (const label of ["I checked the physical documents.", "I verified the applicant's identity."])
    expect(staffCopy(label)).toBe(label);
});

it("changes nested display text without changing the published form or saved answers", () => {
  const original = parseFormTemplateDefinition({ schemaVersion: 1, sections: [{
    key: "details", step: "details", title: "Your details", fields: [{
      key: "relationship", type: "select", label: "Are you the person named on the record?",
      options: [{ value: "owner", label: "I am the document owner", notice: {
        variant: "default",
        title: "Check your copy", description: "Staff will verify your authority to file.",
      } }, { value: "other", label: "No, I am asking on someone else's behalf" }],
    }, {
      key: "applicant_name", type: "text", label: "Your name", placeholder: "Your name",
      visibleWhen: { field: "relationship", operator: "equals", value: "owner" },
    }, { key: "subjects", type: "person_group", label: "Person named on the record" }],
  }] });
  const snapshot = JSON.stringify(original);
  const display = staffFormDefinition(original);
  expect(display.sections[0].title).toBe("Applicant's information");
  expect(display.sections[0].fields[0].options?.[0]).toMatchObject({
    value: "owner", label: "Document owner", notice: { title: "Check the record copy" },
  });
  expect(display.sections[0].fields[1].visibleWhen).toEqual(original.sections[0].fields[1].visibleWhen);
  const answers = { relationship: "owner", applicant_name: "Yours Truly" };
  expect(canonicalizeTemplateAnswers(display, answers)).toEqual(canonicalizeTemplateAnswers(original, answers));
  expect(JSON.stringify(original)).toBe(snapshot);
});
