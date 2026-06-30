import { useRouteContext } from "@tanstack/react-router";
import {
  hasPermission,
  getPermissions,
  isInternalRole,
  type Permission,
  type Role,
} from "~/lib/permissions";

export function usePermissions() {
  const { user } = useRouteContext({ from: "__root__" });
  const role = (user?.role ?? "applicant") as Role;

  return {
    role,
    permissions: getPermissions(role),
    can: (permission: Permission) => hasPermission(role, permission),
    isInternal: isInternalRole(role),
    isAdmin: role === "admin",
  };
}
