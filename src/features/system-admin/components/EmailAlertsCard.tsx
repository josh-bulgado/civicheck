import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import type { HealthSettings } from "../system-admin.types";

/** One email to the system administrators when an incident opens or closes, at most once per cooldown. */
export function EmailAlertsCard({
  settings,
  canManage,
  pending,
  onChange,
}: {
  settings: HealthSettings;
  canManage: boolean;
  pending: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <Card variant="quiet" size="sm">
      <CardHeader>
        <CardTitle>
          <h2 id="health-alerts-title" className="text-lg font-bold">
            Email Alerts
          </h2>
        </CardTitle>
        <CardDescription>
          Email system administrators when an incident opens or closes. At most one email every {settings.cooldownMinutes} minutes.
        </CardDescription>
        <CardAction className="flex items-center gap-2">
          {pending ? <Spinner aria-hidden="true" /> : null}
          <Switch
            aria-labelledby="health-alerts-title"
            checked={settings.emailAlerts}
            disabled={!canManage || pending}
            onCheckedChange={onChange}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-pretty text-muted-foreground">
          Sending also needs RESEND_API_KEY in the health-probe function&apos;s secrets. Without it, alerts stay on the page.
        </p>
      </CardContent>
    </Card>
  );
}
