export const OPEN_PROBLEM_REPORT = "civicheck:report-problem";
export function openProblemReport() {
  window.dispatchEvent(new Event(OPEN_PROBLEM_REPORT));
}
