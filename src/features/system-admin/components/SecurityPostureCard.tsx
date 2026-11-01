import type { DisplayHotkey } from "@tanstack/react-hotkeys";
import { QuietLink as Link } from "~/components/quiet-link";
import { postureContent } from "../security-center.utils";
import { countLabel } from "../system-health.utils";
import type { SecurityGlance } from "../system-admin.types";

export function SecurityPostureCard({ security, hotkeyLabel }: { security: SecurityGlance; hotkeyLabel: (hotkey: DisplayHotkey) => string }) {
  return (
    <Link to="/system-admin/security" className="health-setting-card health-security-setting" title={`Open Security Center (${hotkeyLabel("S")})`}>
      <div><h2>Security posture <span className="health-setting-badge" data-posture={security.posture}>{postureContent[security.posture].label}</span></h2>
        <p>{countLabel(security.openFindingCount, "open finding")} · {countLabel(security.overdueControlCount, "policy review")} due</p></div>
    </Link>
  );
}
