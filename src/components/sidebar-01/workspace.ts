import type { Role } from "~/lib/permissions";

export type WorkspaceDetails = {
  label: string;
  description: string;
};

export function getWorkspaceDetails(role: Role): WorkspaceDetails {
  switch (role) {
    case "applicant":
      return {
        label: "Citizen Portal",
        description: "Find services and manage your requests",
      };
    case "frontdesk":
      return {
        label: "Outlet Workspace",
        description: "Assisted services and outlet requests",
      };
    case "admin":
      return {
        label: "CCRO Administration",
        description: "Services, personnel, and citywide requests",
      };
    default:
      return {
        label: "CCRO Workspace",
        description: "Civil registry operations and requests",
      };
  }
}
