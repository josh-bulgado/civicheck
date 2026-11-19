// Older requests keep the single field; new forms store all three name parts.
export function motherMaidenName(answers: Record<string, unknown>): string {
  return maidenName(answers, "mother");
}

export function wifeMaidenName(answers: Record<string, unknown>): string {
  return maidenName(answers, "wife");
}

function maidenName(answers: Record<string, unknown>, person: "mother" | "wife"): string {
  const keys = [`${person}_first_name`, `${person}_middle_name`, `${person}_last_name`];
  if (keys.some((key) => typeof answers[key] === "string")) {
    return keys.map((key) => typeof answers[key] === "string" ? answers[key].trim() : "")
      .filter((part) => part && part !== "N/A").join(" ");
  }
  const oldName = answers[`${person}_maiden_name`];
  return typeof oldName === "string" ? oldName.trim() : "";
}
