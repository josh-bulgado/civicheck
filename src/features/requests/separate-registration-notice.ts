import type { NextStepsView } from "./next-steps";

// Keep the visit instruction with the next action; show registration rules separately.
export function separateRegistrationNotice(next: NextStepsView | null, notice: string | null): NextStepsView | null {
  if (!next || !notice) return next;
  if (next.kind === "steps") return { kind: "steps", steps: next.steps };
  const lines = notice.split("\n");
  const waitInstruction = lines.find((line) => line.startsWith("Wait for"));
  const remaining = next.text.replace(notice, "").trim();
  const text = [waitInstruction, remaining].filter(Boolean).join("\n\n");
  return text ? { kind: "line", text } : null;
}
