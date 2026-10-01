# Switching WhatsApp providers — a 30-minute procedure

Every WhatsApp send and webhook goes through `src/lib/whatsapp/`. The active
provider is chosen by one environment variable, so switching needs no code or
schema change:

| `WHATSAPP_PROVIDER` | Provider | Notes |
|---|---|---|
| `meta-cloud` (default) | Meta Cloud API, direct | No platform fee. Full template API. |
| `aisensy` | AiSensy BSP | Templates only (no free-form replies). Create one **API campaign per template, named exactly like the template**. No template API — sync from Meta instead. |
| `interakt` | Interakt BSP | Templates and free-form replies. No template API wired — sync from Meta instead. |
| `wati` | WATI BSP | Rollback path only. Behaves exactly like the pre-abstraction code. |

Templates are approved on **our** WhatsApp Business Account (WABA), not on the
BSP. A BSP that connects to our existing WABA inherits every approved template
unchanged.

Env vars for each provider are listed in `.env.example`.

---

## Pre-flight

1. **Confirm the new provider connects to the SAME WABA.** If onboarding
   creates a *new* WABA, every template needs re-approval. That turns this
   from 30 minutes into about 3 days, so stop and plan for it.
2. **Check the templates:**

   ```bash
   npm run whatsapp:verify-templates -- --provider=<new>
   ```

   This confirms that every template our code sends exists, is APPROVED, and
   takes the parameters we pass. It covers:
   - CRM templates linked to a WABA template;
   - the OTP template;
   - anything listed in `WA_REQUIRED_TEMPLATES`.

   It exits non-zero on any problem. For AiSensy and Interakt it reads
   templates from Meta, so the `META_*` credentials must be set wherever you run it.
3. **Note the current messaging tier and quality rating** in
   *Admin → Settings → WhatsApp*.

## Switch

4. Set `WHATSAPP_PROVIDER` and the new provider's credentials in the
   environment (Vercel → Project → Settings → Environment Variables).
5. Point the new provider's webhook at `https://<domain>/api/webhooks/whatsapp`.
   - **Meta:** use the same URL, with `META_WEBHOOK_VERIFY_TOKEN` as the verify
     token. Subscribe to `messages`, `message_template_status_update` and
     `phone_number_quality_update`.
   - **AiSensy:** add `?token=<AISENSY_WEBHOOK_SECRET>` to the URL.
   - **Interakt:** set the webhook secret to `INTERAKT_WEBHOOK_SECRET`.
6. Deploy.
7. Go to *Admin → Settings → WhatsApp* and click **Run health check**.
8. Click **Send test message** and send a template to your own number.
9. Reply to it. Confirm the inbound message appears on the matching lead's
   timeline, or creates a lead.
10. Confirm delivery and read ticks arrive in *Admin → WhatsApp → All logs*.

## Verify (first 24h)

11. Watch *All logs* filtered to **Any error**. A spike in one normalised error
    (`AUTH_FAILED`, `TEMPLATE_NOT_FOUND`, `INSUFFICIENT_BALANCE`…) points
    straight at the cause.
12. Confirm the weekly report batch sends and the delivery rate holds.
13. Compare spend per message against the previous provider. Spend is
    computed from our own logs at Meta's rates, so it is directly comparable.

## Rollback

14. Set `WHATSAPP_PROVIDER` back to the old value and redeploy. The database
    needs no change.

    The old WATI webhook URLs (`/api/webhooks/whatsapp-inbound`,
    `/api/admin/whatsapp/webhook`) keep working until **28 Oct 2026**. They
    are served by the WATI adapter directly rather than redirected, because
    webhook senders rarely follow redirects on POST. After that date they
    return `410 Gone`.

---

## Things that behave differently per provider

- **Free-form text** (a CRM template with no linked WABA template, or STOP
  confirmations) only reaches someone inside the 24-hour window after their
  last message.
  - Outside the window it fails with `OUTSIDE_SESSION_WINDOW`.
  - On AiSensy it always fails with `UNSUPPORTED_OPERATION`.
  - Link CRM templates to approved WABA templates to avoid both.
- **Numbers:** calling code always passes E.164 with `+`, and each adapter
  reformats:
  - Meta and AiSensy drop the `+`;
  - Interakt splits the country code from the number;
  - WATI uses its original format.
- **Webhook authenticity:**
  - Meta and Interakt use an HMAC over the raw body;
  - AiSensy and WATI use a shared secret.
  - Every check fails closed: with no secret set, webhooks return 401.
- **The AiSensy and Interakt webhook parsers are best-effort.** Their payload
  formats are not formally published. Send one real inbound message and one
  delivery receipt during step 9–10 and check they normalise correctly.

## Where to look

- Provider, templates, spend and alerts: `/admin/settings/whatsapp`.
- Every message, filterable: `/admin/whatsapp/logs`.
- Daily maintenance runs `/api/cron/whatsapp-maintenance` (01:00 UTC). It:
  - retries unprocessed webhook events;
  - syncs templates;
  - runs a health check and quality check;
  - checks tier usage.
- Alerts are raised when:
  - a template becomes REJECTED, PAUSED or DISABLED;
  - quality drops to YELLOW or RED;
  - 80% of the messaging tier is used;
  - a health check fails.

  They show on the settings page, and are emailed to `WHATSAPP_ALERT_EMAIL`
  (or `ADMIN_EMAIL`) when email is live.
- **1 Oct 2026:** service messages become chargeable beyond 1,000 a month.
  Set `WA_RATE_SERVICE_PAISE` to the utility rate. The service-conversation
  counter on the settings page already tracks the allowance.
