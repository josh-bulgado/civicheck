import type { Department } from "./departments.queries";

/** Department filter value meaning "no department filter". */
export const ALL_DEPARTMENTS = "all";

/**
 * Options for a department filter select: everything, each active department,
 * then the rows no department owns. `unassigned` is the value that last option
 * stands for, which the Services and Request Queue filters each define.
 */
export function departmentFilterOptions(
  departments: ReadonlyArray<Department>,
  unassigned: string,
): Array<{ value: string; label: string }> {
  return [
    { value: ALL_DEPARTMENTS, label: "All departments" },
    ...departments.map(({ id, name }) => ({ value: id, label: name })),
    { value: unassigned, label: "Unassigned" },
  ];
}
