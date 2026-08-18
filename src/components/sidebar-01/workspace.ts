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
    case "cashier":
      return {
        label: "Cashier Counter",
        description: "Payment collection and verification",
      };
    case "admin":
      return {
        label: "CCRO Administration",
        description: "Services, personnel, and citywide requests",
      };
    case "system_admin":
      return {
        label: "System Administration",
        description: "Platform health, account oversight, and audit controls",
      };
    default:
      return {
        label: "CCRO Workspace",
        description: "Civil registry operations and requests",
      };
  }
}
