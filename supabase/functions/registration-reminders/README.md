# Registration deadline reminders

Submitting an online request with 3 or 1 day left immediately queues its reminder after the submission commits. The cron job `registration-deadline-reminders` also checks every 15 minutes, including when nobody is signed in, for existing requests and retries. Dates use Asia/Manila. Email inbox delivery can take additional time.

Online on-time birth and death registrations use 30 days from the event date. Marriage uses 15 days with a license, or 30 days for Article 34 / P.D. 1083. Missing marriage basis or invalid dates do not produce a guessed deadline.

Each request gets one in-app notification and email with 3 days remaining and another with 1 day remaining. Online submission does not reset the deadline. **Mark ready for release** confirms that staff checked the hard copies at the office and stops reminders. Requests that have reached that stage, requests that end, and walk-ins are skipped. No separate hard-copy action is required.

The unique request/deadline/reminder-day key prevents duplicate notifications. Email batches contain at most 10 messages; a 15-minute lease prevents overlapping sends. Failed email delivery is retried up to five times on the matching reminder day. Resend idempotency keys prevent duplicate email after a delivery-status write fails.

## Deployment

1. Apply the registration reminder migrations in chronological order, including `limit_registration_reminder_batches`, `stop_office_reminders_at_ready_for_release`, and `immediate_registration_reminders`.
2. Deploy `index.ts` as `registration-reminders` with JWT verification disabled. It authenticates the cron's Vault-generated `x-reminder-secret` through a service-only RPC.
3. From a trusted service-role client, call `configure_registration_reminder_email` with `p_api_key`, `p_from`, and optional `p_reply_to`. Use the same Resend update sender as the application. Credentials stay in Vault; applicants and staff cannot read them.
4. Call `install_registration_reminder_schedule` with `p_function_url` set to `https://<project-ref>.supabase.co/functions/v1/registration-reminders`.

To disable the schedule: `select cron.unschedule('registration-deadline-reminders');`

## Manual test

Use a test applicant with an event date 27 days ago for birth/death, or 12 days ago for licensed marriage. After submitting, check the notification and email for **3 days left** without waiting for the scheduled run. Re-running must not duplicate them. Use 29 / 14 days ago to test **1 day left**.

On a separate test request, mark it **Ready for release** before the next run. Neither reminder should be sent. Released, rejected, and cancelled requests must also receive no reminders. Do not change real applicants' event dates to test this.
