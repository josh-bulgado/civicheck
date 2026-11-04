# Gmail delivery investigation and recovery

## November 4: new domain verified and Gmail test accepted

The user registered `civicheck.xyz` and added the Resend DNS records in Porkbun.
Read-only checks confirmed the public records and Resend's domain verification:

- Domain ID: `bce2dc3c-d14b-4e88-a8c3-793e3c0d2c2a`; region: `ap-northeast-1`.
- Domain, DKIM and both sending CNAME records are verified; sending is enabled.
- DKIM TXT host: `resend._domainkey.civicheck.xyz`.
- Sending CNAMEs: `rsend.civicheck.xyz` points to
  `rsend-apne1.forge.rmta.net`; `send.civicheck.xyz` points to
  `send.forge.rmta.net`. The first CNAME host is **`rsend`**, not `resend`.
- DMARC at `_dmarc.civicheck.xyz`: `v=DMARC1; p=none;`.
- Open and click tracking are disabled; receiving is disabled.

The user supplied a Gmail inbox they control for one delivery test. At
16:09:45 Singapore time, the existing `sendEmail` utility and OTP renderer sent
one explicitly nonfunctional test from `CiviCheck <noreply@civicheck.xyz>`.
Resend email ID: `01a1a59b-d556-7c1e-b26c-43da8c961740`; final event:
**`delivered`**. No account or authentication tokens were created or changed.
The ignored receipt is
`artifacts/gmail-xyz-delivery-test-2026-11-04.json`.

Gmail accepted this test; Inbox versus Spam placement has not been confirmed.
This does not establish the cause of the old domain's failures or verify the
deployed application's signup and recovery flows.

The delivery test used
`RESEND_FROM_EMAIL="CiviCheck <noreply@civicheck.xyz>"`. The application now
supports separate `RESEND_FROM_AUTH`, `RESEND_FROM_UPDATES` and
`RESEND_FROM_ALERTS` senders, with `RESEND_FROM_EMAIL` retained only as a
migration fallback. Production has not been changed: configure the category
senders in the intended CiviCheck Vercel project and redeploy. Then verify an
actual signup/recovery flow with the inbox owner. Review the health-probe's
sender secrets separately as described in the recovery steps below.

## November 3: previous domain investigation

Checked against the live Resend API and public DNS on November 3, 2026.
The initial investigation was read-only. An authorized support submission and
single Gmail delivery test followed; their results are recorded below. No DNS
or Resend account settings were changed.

## Authorized follow-up on November 3

The user authorized sending the prepared report to Resend support and supplied
a Gmail inbox they control for one delivery test.

| Action | Singapore time | Resend email ID | Final event |
| --- | --- | --- | --- |
| Support report to `support@resend.com` | 11:38:07 | `01a19f7c-c86b-7271-9139-49cca043588a` | Delivered |
| Single requested Gmail delivery test | 11:38:18 | `01a19f7c-f470-7c3e-a6c2-5dadda6313a4` | Bounced |

The Gmail connector was unavailable, so the support report was sent through
Resend using the current CiviCheck sender, with the user's Gmail inbox as
Reply-To. Resend confirmed delivery of the report. The provider's ticket number
and response are not yet available.

The test used the existing OTP email renderer, an explicitly nonfunctional test
code and matching plain text. It did not generate auth tokens or change an
account. Gmail rejected it with the same `550 5.7.1` unsolicited-mail diagnostic,
this time from `23.251.234.61`, a fourth observed sending IP. The message was not
retried. Final events were retrieved at 11:38:25 Singapore time.

At that point, Gmail delivery remained blocked on the old domain. Resend's
investigation was the next external step. An actual verification/recovery flow
still needs a successful retest after migration. Full receipts are stored
locally under ignored `artifacts/` files.

## Confirmed evidence

- Sender: `CiviCheck <noreply@civicheck.abrdns.com>`.
- Resend domain ID: `dbcd97f9-5b40-46f1-bbd0-c0e1ae4d028d`.
- Region: `ap-northeast-1`. Sending enabled; domain, SPF and DKIM verified.
- Public DNS publishes the expected DKIM key at
  `resend._domainkey.civicheck.abrdns.com` and SPF
  `v=spf1 include:amazonses.com ~all` at `send.civicheck.abrdns.com`.
- DMARC exists at `_dmarc.civicheck.abrdns.com`:
  `v=DMARC1; p=none;`. This is a valid monitoring policy, not a missing record.
- Open and click tracking are disabled.
- At the initial check, the 136 available email records contained eight Gmail deliveries, eight Gmail
  bounces and 120 deliveries to other providers.
- The most recent Gmail acceptance was October 29, 2026 at 00:05:38 Singapore
  time (October 28 at 16:05:38 UTC). Its message ID is
  `01a18342-89a1-74d5-b1a6-7d79d455c109`.
- The eight later Gmail messages, beginning November 1 at 11:24:51 Singapore
  time, bounced. Both verification and password recovery were affected.
- Three inspected failures used different sending IPs:
  `23.251.234.51`, `23.251.234.52` and `23.251.234.60`.
- All three inspected failed messages already had HTML and plain-text parts and
  no links. The November 1 verification failure used the simplified 1,361-byte
  HTML template and the newer subject. Simplifying the template had not restored
  delivery in that attempt.
- Resend classifies these failures as `Transient / ContentRejected`; the actual
  Gmail SMTP response is `550 5.7.1`, likely unsolicited mail. The classification
  does not establish which content or reputation signal triggered Gmail.

The evidence points to Gmail filtering of the sender or sending path. DNS
verification does not prove the authentication results of an individual message,
and these API records do not expose Gmail's internal reputation scores. Resend
needs to inspect the affected messages and sending infrastructure to narrow the
cause. Do not describe the incident as fixed until Gmail accepts a fresh message.

## Recovery steps

1. Await Resend's response to the submitted support request below. The report
   requests message authentication/alignment and sending-pool investigation.
   [Resend Help](https://resend.com/help) is the support entry point if needed.
2. Review the failed email's Deliverability Insights in Resend and the domain/IP
   reputation in [Google Postmaster Tools](https://postmaster.google.com/).
   A low-volume sender may not have enough traffic for Postmaster charts.
3. Keep the currently verified DNS records while investigating. Changing DMARC
   from `p=none` to `p=reject` is not a remedy for Gmail's unsolicited-mail block.
4. If Resend recommends changing the sending domain, verify a domain controlled
   by this project, with its exact Resend-provided DKIM and return-path SPF/MX
   records in ClouDNS. Publish DMARC for that sender and keep tracking disabled.
   A replacement domain still needs legitimate sending history; changing a
   domain does not guarantee Gmail acceptance.
5. Set `RESEND_FROM_AUTH` and `RESEND_FROM_UPDATES` in the app's deployment
   environment to addresses on the verified domain, then redeploy. Auth covers
   signup, password reset and staff invitations. Updates covers request events.
   Set `RESEND_REPLY_TO` only to a mailbox that exists and is monitored.
6. Set `RESEND_FROM_ALERTS` and `RESEND_REPLY_TO` in the Supabase `health-probe`
   function secrets and redeploy that function if health alerts should send.
   `HEALTH_ALERT_FROM`, when set, takes precedence for health alerts and must
   also be reviewed during migration.
7. With authorization and a recipient address supplied by the inbox owner, send
   one fresh verification email. Check its final Resend event: API acceptance
   or `sent` alone is not delivery. Confirm inbox/spam placement and inspect
   Gmail's **Show original** for SPF, DKIM and DMARC results. Verify password
   reset and request notifications with authorized recipients after delivery
   recovers. Do not repeatedly resend the same blocked message.

`RESEND_FROM_EMAIL` remains a migration fallback. A missing category sender and
missing fallback now stops the send before contacting Resend. Configuration is
not evidence that the current Gmail block has been lifted. Code changes require deployment.

## Submitted support request

Subject: Gmail 550 5.7.1 for verified CiviCheck transactional sender

We need help investigating Gmail rejection of requested account verification and
password recovery emails from `noreply@civicheck.abrdns.com`.

Domain ID: `dbcd97f9-5b40-46f1-bbd0-c0e1ae4d028d`; region: `ap-northeast-1`.
Resend reports the domain, SPF and DKIM verified. Public DMARC is
`v=DMARC1; p=none;`. Open/click tracking are disabled. The inspected failures have
both text and HTML parts and no links. A simplified verification template also
failed. Other providers accepted messages; Gmail previously accepted messages.

Examples (times below are UTC, matching API logs):

| Resend email ID | Timestamp | Subject | Sending IP | Outcome |
| --- | --- | --- | --- | --- |
| `01a19f69-ae70-77bf-9684-bb11114a887b` | 2026-11-03 03:17:45 | Confirm your CiviCheck account | `23.251.234.52` | Bounced |
| `01a19f62-e9c1-7213-bab4-a4fd2ada4446` | 2026-11-03 03:10:22 | Reset your CiviCheck password | `23.251.234.60` | Bounced |
| `01a19549-4741-7b70-baca-693e351be7ed` | 2026-11-01 04:06:10 | Your CiviCheck email verification code | `23.251.234.51` | Bounced |
| `01a18342-89a1-74d5-b1a6-7d79d455c109` | 2026-10-28 16:05:38 | Reset your CiviCheck password | Not inspected | Delivered to Gmail |

Example diagnostic from the November 3 password reset:

```text
smtp; 550-5.7.1 [23.251.234.60      12] Gmail has detected that this message is likely550-5.7.1 unsolicited mail. To reduce the amount of spam sent to Gmail, this550-5.7.1 message has been blocked. For more information, go to550 5.7.1  https://support.google.com/mail/?p=UnsolicitedMessageError d2e1a72fcca58-8aadb946e25si18255412b3a.144 - gsmtp
```

Please inspect these messages' emitted authentication and alignment, compare the
previously accepted Gmail message, and investigate sending-pool/domain reputation
or content filtering signals. Please advise whether any affected recipients are
suppressed and whether a provider-side remediation is needed before a controlled
retest. We are not asking to bypass recipients' spam protections.

## References

- [Gmail: why messages are blocked](https://support.google.com/mail/answer/188131)
- [Google email sender guidelines](https://support.google.com/mail/answer/81126)
- [Resend deliverability troubleshooting](https://resend.com/guides/email/deliverability/why-emails-go-to-spam)
- [Resend Deliverability Insights](https://resend.com/blog/deliverability-insights)
