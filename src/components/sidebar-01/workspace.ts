import type { CSSProperties } from "react";
import type { Role } from "~/lib/permissions";

// The sidebar, its 10px outer frame and the 6px gap before the main panel.
// Shared with the pending frame so the first login keeps the same tile widths.
export const WORKSPACE_SIDEBAR_STYLE = {
  "--sidebar-width": "calc(clamp(220px, 20vw, 248px) + 1rem)",
  "--sidebar-width-icon": "4.5rem",
} as CSSProperties;

// The applicant's shell: the area beside the sidebar, the one floating panel in
// it, and the page's own container. Shared by the dashboard layout and its
// loading frame, so the frame is the layout and the swap moves nothing.
//
// 10px of frame on every side; on desktop the sidebar column already carries the
// left one (and the 6px gap), open or folded to icons, so it is dropped. From
// `md` the panel fills the space beside the sidebar, top bar first, with no
// max-width: a cap leaves dead ground on wide screens. On a phone there is no
// panel: the page sits on the ground with 20px at the sides, and 130px below it
// for the bottom bar.
export const CITIZEN_INSET_CLASS =
  "min-w-0 bg-transparent p-0 md:p-2.5 md:pl-0";
export const CITIZEN_PANEL_CLASS =
  "flex w-full flex-1 flex-col gap-4.5 px-5 pt-4 pb-32.5 md:gap-7 md:rounded-panel md:bg-portal-panel md:px-11 md:pt-7 md:pb-9 md:shadow-portal-panel short:md:gap-5 short:md:pt-5 short:md:pb-6";
export const CITIZEN_MAIN_CLASS =
  "civic-workspace flex flex-1 flex-col text-foreground";

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
