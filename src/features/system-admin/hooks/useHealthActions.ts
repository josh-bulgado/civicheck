import { useCallback } from "react";
import { useActionRunner } from "~/hooks/useActionRunner";
import {
  acknowledgeHealthEvent,
  recordMaintenance,
  runHealthCheck,
  setHealthAlerts,
  updateHealthLimits,
} from "../system-health.functions";
import type { HealthLimitsInput, MaintenanceInput } from "../system-admin.types";

export type HealthPendingAction = "check" | "maintenance" | "acknowledge" | "limits" | "alerts";

/** What a system administrator can do on the health page. Each action is audited by the server. */
export function useHealthActions() {
  const { pending, run } = useActionRunner<HealthPendingAction>("The action could not be completed.");

  const checkNow = useCallback(
    () => run(() => runHealthCheck(), "check", "Checks ran. The readings are up to date."),
    [run],
  );

  const record = useCallback(
    (input: MaintenanceInput) =>
      run(() => recordMaintenance({ data: input }), "maintenance", "Maintenance recorded."),
    [run],
  );

  const acknowledge = useCallback(
    (eventId: string) =>
      run(() => acknowledgeHealthEvent({ data: { eventId } }), "acknowledge", "Incident acknowledged."),
    [run],
  );

  const saveLimits = useCallback(
    (input: HealthLimitsInput) =>
      run(() => updateHealthLimits({ data: input }), "limits", "Limits saved."),
    [run],
  );

  const setAlerts = useCallback(
    (enabled: boolean) =>
      run(
        () => setHealthAlerts({ data: { enabled } }),
        "alerts",
        enabled ? "Email alerts are on." : "Email alerts are off.",
      ),
    [run],
  );

  return { pending, checkNow, record, acknowledge, saveLimits, setAlerts };
}
