# WhatsApp buyer concierge

When a buyer messages the business number, the concierge asks five quick
questions. It sends back their best-matched properties with a Property Tiger
rating, why each one suits them, a watch-out, and a link to a personal report.
It also:

- creates the lead in the CRM, with a buyer profile and persona;
- emails the team (`CONCIERGE_ALERT_EMAIL`, default rniteshvarma@gmail.com).

## The conversation

| # | Question | Answer format | Skipped when |
|---|---|---|---|
| — | Name | text | WhatsApp gives us their profile name (almost always) |
| 1 | Investment / own use / both | 3 buttons | their first message already says it |
| 2 | Property type | list of 9 | already said ("villa plot…") |
| 3 | Area | list of the top corridors + "Suggest for me", or any locality typed | already said ("…near Kokapet") |
| 4 | Budget | list of ranges, or typed ("45 lakhs", "1.2 cr") | already said |
| 5 | Holding period (investors), or move-in timing (own use) | 3 buttons | already said |
| — | Anything else? (loan, gated, schools…) | text or Skip | never; it's optional |

How it keeps people answering:

- **Mostly taps.** Every question has buttons or a list.
- **Progress is visible** ("3/5").
- **Nothing is asked twice.** A rich opener skips ahead.
- **Nobody gets stuck.** Two misses on a question skip it.
- **A person is one word away.** Typing **AGENT** at any time hands over to a person.
- **STOP, PAUSE and START are always respected.** These are the WhatsApp provider layer's keywords.
- **Residential vs commercial is never asked.** The property type answers it.
- **NRI status is never asked.** It comes from the number's country code.

Providers without interactive messages (AiSensy, Interakt) get the same
questions as numbered text; a reply of "2" picks the second option.

## Behind the scenes

1. **Engine.** `src/lib/concierge/engine.ts` is pure: a slot-filling checklist with deterministic parsers (`parse.ts`).
2. **Claude.** With `ANTHROPIC_API_KEY` set, Claude (`CONCIERGE_MODEL`, default `claude-opus-5`, low effort) does two things, both bounded (`ai.ts`):
   - it reads free text the parsers can't handle, returning structured output restricted to our corridor slugs;
   - it writes the 2–3 sentence "quick take" from the ranked facts only.

   Without a key, or on any error, the parsers and a template take over.
3. **Persona.** `persona.ts` maps the answers to one of 12 personas. The six new ones are:
   - Commercial Investor
   - Rental Income Seeker
   - Farm Land & Lifestyle
   - Family Upgrader
   - Self-Build Homeowner
   - Land Banker
4. **Matching and rating.** `match.ts` scores each approved listing on fit (0–100):
   - property type 30
   - budget 25
   - area 20
   - purpose 10
   - horizon or timeline 10
   - persona 5

   Rating /10 = 70% fit + 30% the corridor's intelligence score, minus 1 if the listing's risk doesn't suit the persona.

   A listing of a different type is never called a "match". If nothing fits, the header says so, shows the closest options and suggests the best areas.
5. **CRM.** `finalize.ts`:
   - creates or updates the lead (source `whatsapp-concierge`, channel WhatsApp) with purpose, types, areas, timeline, NRI flag and requirements;
   - sets the persona and lead score, and writes project matches;
   - creates a phone-only user with an internal placeholder email that is never mailed;
   - sets report preferences (weekly sends stay **off** until they tap *Weekly updates*);
   - generates their report.
6. **Report.** The existing weekly-report feature builds it. The link `/report/<token>` is sent in the chat.

## Listings

The property form has a **Buyer fit** section:

- what the listing is (multi-select);
- whether it suits investment and/or own use;
- target personas, with a *Suggest from details* button;
- expected rental yield.

Untagged listings are tagged automatically from their property type when saved. To tag existing listings:

```bash
npm run concierge:backfill            # dry run
npm run concierge:backfill -- --apply
```

## CRM

- `/admin/concierge` is the inbox. It has:
  - the question-by-question drop-off funnel;
  - conversations filtered by state;
  - the transcript;
  - **Take over** / **Hand back to bot**, and replying as an advisor. Replies only deliver within 24h of the customer's last message.
- `/admin/concierge/simulator` lets you chat as a customer through the real engine, with no WhatsApp. It creates real CRM records (source `concierge-simulator`), and the email is marked *[Simulator]*.
- Each lead page shows the buyer profile, the persona and a link to the chat.

## Upkeep

The daily WhatsApp cron (and, throttled, webhook traffic) handles three cases:

- **Stopped part-way:** one nudge 2–22h after someone stops, inside the free 24h window.
- **Silent for 72h:** the conversation is marked abandoned, saved as a partial lead, and the team is emailed.
- **Stuck in PROCESSING:** the conversation is handed to a person.

## Settings

| Env | Default | Meaning |
|---|---|---|
| `CONCIERGE_ENABLED` | `true` | `false` turns the bot off (inbound messages just attach to leads) |
| `CONCIERGE_ALERT_EMAIL` | rniteshvarma@gmail.com | who gets the new-interest emails |
| `CONCIERGE_MODEL` | `claude-opus-5` | model for extraction and the quick take |
| `CONCIERGE_AI` | — | `off` forces the parsers only |
| `NEXT_PUBLIC_APP_URL` | `NEXTAUTH_URL` | base URL for report links |

## Tests

```bash
npm run test:geo          # includes the concierge unit tests
npm run test:concierge    # end-to-end through the simulator channel, against the dev DB
```
