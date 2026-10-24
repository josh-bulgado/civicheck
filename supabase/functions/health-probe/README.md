# health-probe

Measures the database, authentication and document storage, and hands the numbers to
`system_health_record_run`. Called every 15 minutes by `pg_cron` and by Check Now in the app.

It only measures. What a measurement means, and when an incident opens or closes, is decided in
the database, so the schedule and Check Now cannot disagree.

## Switching the checks on

Do these in order. Nothing is scheduled until the last step.

1. Apply the two migrations: `20261024120000_system_health_monitoring.sql`, then
   `20261024120100_system_health_schedule.sql`.
2. Deploy the function without gateway JWT checks (it authenticates with the shared secret):
   `supabase functions deploy health-probe --no-verify-jwt`
3. Create the Vault secrets. The shared secret is generated in the database:
   `select public.system_health_prepare_secrets('https://<project-ref>.supabase.co/functions/v1/health-probe');`
4. Read the generated secret once, in the Supabase SQL editor:
   `select decrypted_secret from vault.decrypted_secrets where name = 'health_probe_secret';`
5. Enter that value in two places:
   - the Edge Function secret `HEALTH_PROBE_SECRET` (Dashboard, Edge Functions, Secrets)
   - the app's `.env` as `HEALTH_PROBE_SECRET`
6. Switch the schedule on: `select public.system_health_install_schedule();`

To switch it off: `select public.system_health_remove_schedule();`

## Email alerts (optional)

Alerts are off by default. Turn them on from the System Health page. The function sends through
Resend only when these Edge Function secrets exist; without them it skips the email quietly:

| Secret | Purpose |
| --- | --- |
| `RESEND_API_KEY` | The same key the app uses |
| `HEALTH_ALERT_FROM` | Optional. Defaults to `CiviCheck <noreply@civicheck.abrdns.com>` |
| `APP_URL` | Optional. Adds an "Open System Health" link |

## Privacy

Metadata only: availability, response time, object count and total bytes. The function never reads
request data, document names or paths, or anything a citizen submitted.
