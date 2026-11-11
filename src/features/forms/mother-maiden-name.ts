// Older requests keep the single field; new forms store all three name parts.
export function motherMaidenName(answers: Record<string, unknown>): string {
  const keys = ["mother_first_name", "mother_middle_name", "mother_last_name"];
  if (keys.some((key) => typeof answers[key] === "string")) {
    return keys.map((key) => typeof answers[key] === "string" ? answers[key].trim() : "")
      .filter((part) => part && part !== "N/A").join(" ");
  }
  return typeof answers.mother_maiden_name === "string" ? answers.mother_maiden_name.trim() : "";
}
