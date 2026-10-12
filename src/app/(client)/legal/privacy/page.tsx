/**
 * /legal/privacy — Privacy Policy. Written to match what the app actually
 * collects and who processes it (accounts, enquiries, seller listings,
 * WhatsApp, cookies/local storage, hosting & email providers), structured for
 * India's Digital Personal Data Protection Act, 2023 and the IT Act, 2000.
 * Entity / grievance details come from env vars (src/lib/legal.ts).
 * Update LEGAL_LAST_UPDATED when this text changes.
 */
import React from "react";
import Link from "next/link";
import LegalPage, { A, P, Section, UL } from "@/components/legal/LegalPage";
import { LEGAL_LAST_UPDATED, legalDetails } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy | Property Tiger",
  description: "What personal data Property Tiger collects, why, who it is shared with, how long it is kept, and how to exercise your rights.",
};

const SECTIONS = [
  { id: "who", title: "Who we are" },
  { id: "collect", title: "What we collect" },
  { id: "use", title: "How we use it" },
  { id: "share", title: "Who we share it with" },
  { id: "transfers", title: "Where it is stored" },
  { id: "retention", title: "How long we keep it" },
  { id: "rights", title: "Your rights" },
  { id: "cookies", title: "Cookies & local storage" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact & Grievance Officer" },
];

export default function PrivacyPage() {
  const d = legalDetails();
  const who = d.entity ? `${d.entity} (“${d.brand}”, “we”, “us”)` : `${d.brand} (“we”, “us”)`;
  const mail = (email: string | null, subject: string) =>
    email ? <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}`} style={A}>{email}</a> : <>the contact options on our website</>;

  return (
    <LegalPage
      title="Privacy Policy"
      updated={LEGAL_LAST_UPDATED}
      intro="This policy explains what personal data we collect when you use Property Tiger, why we collect it, who we share it with and the choices you have. We collect only what we need to run the service, and we never sell your personal data."
      sections={SECTIONS}
    >
      <Section id="who" title="1. Who we are">
        <p style={P}>
          Property Tiger is a research platform for land and property in and around Hyderabad, operated by {who}
          {d.address ? `, ${d.address}` : ""}. For the purposes of the Digital Personal Data Protection Act, 2023 (the “DPDP Act”), we are the
          Data Fiduciary for the personal data described here.
        </p>
      </Section>

      <Section id="collect" title="2. What we collect">
        <ul style={UL}>
          <li><strong>Account details</strong> — your name, email address, phone number and a password (stored only as a one-way hash). If you sign in with Google, we receive your name, email address and Google account ID from Google.</li>
          <li><strong>Phone verification</strong> — the phone number you verify and the one-time code we send (codes expire within minutes).</li>
          <li><strong>Enquiries</strong> — when you ask about a project, request a callback or use a calculator that offers follow-up: your name, phone, email, budget, timeline, the property or area you asked about and any message you write.</li>
          <li><strong>Your preferences and saved items</strong> — areas you watch, projects you save, searches, report and alert settings, and the persona and match information we derive from them (see “How we use it”).</li>
          <li><strong>Seller listings</strong> — if you list a property: its details, location, price, photos and any documents you upload, and your contact details.</li>
          <li><strong>WhatsApp messages</strong> — if you message our WhatsApp number, the messages you send and our replies, your phone number and WhatsApp profile name.</li>
          <li><strong>Emails we send</strong> — whether a report email was delivered and your unsubscribe choices.</li>
          <li><strong>Technical data</strong> — a random identifier stored in a cookie so you can save items before signing in, basic request logs kept by our hosting provider (such as IP address, browser and time), and settings stored in your browser (see “Cookies &amp; local storage”).</li>
        </ul>
        <p style={P}>
          <strong>Location:</strong> if you tap “locate me” on the map, your browser shares your position only to centre the map on your screen. It is not
          sent to or stored on our servers.
        </p>
        <p style={P}>We do not ask for, and you should not send us, Aadhaar, PAN, bank or card details.</p>
      </Section>

      <Section id="use" title="3. How we use it">
        <ul style={UL}>
          <li>To run your account, sign you in and keep it secure.</li>
          <li>To answer your enquiries — including passing them to the developer, seller or partner you asked about (see “Who we share it with”).</li>
          <li>To personalise the service: we group users into buyer profiles (for example “first-time buyer” or “NRI investor”) and score how well projects match what you told us, so we can suggest relevant properties and decide which enquiries to follow up first. This is done by software using the details you gave us; it does not decide anything about you that has a legal effect, and you can ask us to review it.</li>
          <li>To send what you asked for — reports, alerts and replies by email or WhatsApp. Every email has an unsubscribe link; reply STOP on WhatsApp to stop messages.</li>
          <li>To review and publish seller listings and to keep the catalogue accurate.</li>
          <li>To prevent fraud and misuse, fix problems and improve the service (using aggregated or de-identified data where we can).</li>
          <li>To meet legal obligations, for example responding to lawful requests from authorities.</li>
        </ul>
        <p style={P}>
          We process your data on the basis of the consent you give when you create an account, submit an enquiry or listing, or message us — which you can
          withdraw at any time — and, where the DPDP Act allows, for legitimate uses such as information you provide voluntarily for a specific purpose and
          compliance with law. Withdrawing consent doesn&apos;t affect processing that happened before, and we may then be unable to provide parts of the service.
        </p>
      </Section>

      <Section id="share" title="4. Who we share it with">
        <ul style={UL}>
          <li><strong>The developer, seller or partner you enquire about</strong> — your name, contact details and enquiry, so they can respond. They handle it under their own privacy terms.</li>
          <li><strong>Buyers who enquire about your listing</strong>, if you are a seller — your listing and the contact details you chose to show.</li>
          <li><strong>Service providers who run parts of the service for us</strong>, only for that purpose and under contract:
            <ul style={{ ...UL, marginTop: 4 }}>
              <li>Vercel — website hosting and file storage</li>
              <li>Supabase — database hosting</li>
              <li>Resend — sending email</li>
              <li>Google — “Sign in with Google”, if you use it</li>
              <li>Meta (WhatsApp Business) and our WhatsApp messaging provider — WhatsApp conversations</li>
              <li>Anthropic — AI assistance for some features (for example drafting replies or summaries); content sent is limited to what the feature needs</li>
              <li>Map tile providers (OpenStreetMap, Esri) — your browser loads map images directly from them, which shares your IP address with them</li>
            </ul>
          </li>
          <li><strong>Authorities</strong>, when required by law or to protect rights and safety.</li>
          <li><strong>A buyer of our business</strong>, if it is sold or merged, under this policy.</li>
        </ul>
        <p style={P}>We do not sell personal data and we do not share it with advertisers.</p>
      </Section>

      <Section id="transfers" title="5. Where it is stored">
        <p style={P}>
          Our database is hosted in Japan (Tokyo) and our website and email providers run servers in other countries, including the United States, so your
          data may be processed outside India. We only use providers that protect it with appropriate safeguards, and we follow any restrictions the
          Government of India notifies under the DPDP Act.
        </p>
      </Section>

      <Section id="retention" title="6. How long we keep it">
        <ul style={UL}>
          <li>Account data — while your account is open. If you delete it, we erase or anonymise it within 30 days, except what we must keep by law.</li>
          <li>Enquiries and WhatsApp conversations — as long as needed to deal with them, and up to 3 years afterwards as a record, unless you ask us to erase them sooner.</li>
          <li>Seller listings — while live, and up to 3 years after removal as a record of what was published.</li>
          <li>The anonymous saved-items cookie expires after 90 days of inactivity; phone verification codes expire within minutes.</li>
          <li>Hosting logs — for the short period our hosting provider keeps them.</li>
        </ul>
        <p style={P}>Where a law requires us to keep something longer (for example for tax or a legal claim), we keep it only for that purpose.</p>
      </Section>

      <Section id="rights" title="7. Your rights">
        <p style={P}>Under the DPDP Act you can:</p>
        <ul style={UL}>
          <li>ask what personal data we hold about you, how we use it and who we have shared it with;</li>
          <li>ask us to correct, complete or update it;</li>
          <li>ask us to erase it, and withdraw consent you have given;</li>
          <li>nominate someone to exercise these rights for you if you die or become unable to;</li>
          <li>raise a grievance with us, and if you are not satisfied, complain to the Data Protection Board of India.</li>
        </ul>
        <p style={P}>
          You can update most details in your <Link href="/dashboard" style={A}>dashboard</Link>, stop report emails from{" "}
          <Link href="/dashboard/settings/reports" style={A}>report settings</Link>, or write to {mail(d.contactEmail, "Privacy request")}. We will confirm your
          identity and respond within 30 days at the latest.
        </p>
      </Section>

      <Section id="cookies" title="8. Cookies & local storage">
        <p style={P}>We don&apos;t use advertising or third-party tracking cookies. We use:</p>
        <ul style={UL}>
          <li><strong>Sign-in cookies</strong> (essential) — keep you signed in and protect forms; they last for your session or until you sign out.</li>
          <li><strong>anon_sid</strong> — a random identifier that lets you save projects and areas before you sign in; up to 90 days.</li>
          <li><strong>news_city</strong> and <strong>dash_mode</strong> — remember your news city and dashboard view; up to 180 days.</li>
          <li><strong>Browser storage</strong> — map style, map layers, recent searches and saved items, kept only in your browser.</li>
        </ul>
        <p style={P}>You can clear these in your browser settings; the site still works, but you will be signed out and lose saved preferences.</p>
      </Section>

      <Section id="security" title="9. Security">
        <p style={P}>
          We use encrypted connections (HTTPS), store passwords only as hashes, limit staff access to what each role needs, and keep admin tools behind
          separate authentication. No system is perfectly secure; if a breach affects your personal data we will inform you and the Data Protection Board
          as the law requires.
        </p>
      </Section>

      <Section id="children" title="10. Children">
        <p style={P}>Property Tiger is for adults. We don&apos;t knowingly collect data from anyone under 18; if you believe a child has given us their details, contact us and we will delete them.</p>
      </Section>

      <Section id="changes" title="11. Changes to this policy">
        <p style={P}>If we change this policy we will update the date above, and for significant changes we will tell you by email or on the site before they apply.</p>
      </Section>

      <Section id="contact" title="12. Contact & Grievance Officer">
        <p style={P}>
          For privacy questions or to exercise your rights: {mail(d.contactEmail, "Privacy request")}.
        </p>
        <p style={P}>
          Grievance Officer{d.grievanceName ? `: ${d.grievanceName}` : ""} — {mail(d.grievanceEmail, "Grievance")}
          {d.address ? <>, {d.address}</> : null}. We acknowledge grievances within 72 hours and resolve them within 30 days.
        </p>
      </Section>
    </LegalPage>
  );
}
