import type { CSSProperties } from "react";
import type { Role } from "~/lib/permissions";

// The sidebar, its 10px outer frame and the 6px gap before the main panel.
// Shared with the pending frame so the first login keeps the same tile widths.
export const WORKSPACE_SIDEBAR_STYLE = {
  "--sidebar-width": "calc(clamp(220px, 20vw, 248px) + 1rem)",
  "--sidebar-width-icon": "4.5rem",
} as CSSProperties;

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
