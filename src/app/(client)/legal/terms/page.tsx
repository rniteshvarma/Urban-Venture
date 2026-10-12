/**
 * /legal/terms — Terms of Use. Describes what the platform is (research &
 * information, listings published by developers/sellers), how its numbers
 * are made (measured listing prices, official guidance values, scenarios),
 * seller obligations, acceptable use, liability and Indian governing law.
 * Entity / grievance details come from env vars (src/lib/legal.ts).
 * Update LEGAL_LAST_UPDATED when this text changes.
 */
import React from "react";
import Link from "next/link";
import LegalPage, { A, P, Section, UL } from "@/components/legal/LegalPage";
import { LEGAL_LAST_UPDATED, legalDetails } from "@/lib/legal";

export const metadata = {
  title: "Terms of Use | Property Tiger",
  description: "The terms for using Property Tiger: what the platform provides, how to read its data, seller listing rules and your responsibilities.",
};

const SECTIONS = [
  { id: "about", title: "About these terms" },
  { id: "what", title: "What Property Tiger is" },
  { id: "data", title: "How to read our data" },
  { id: "accounts", title: "Your account" },
  { id: "enquiries", title: "Enquiries" },
  { id: "sellers", title: "Listing a property" },
  { id: "use", title: "Acceptable use" },
  { id: "third", title: "Third-party content" },
  { id: "ip", title: "Our content" },
  { id: "fees", title: "Fees" },
  { id: "liability", title: "Disclaimers & liability" },
  { id: "end", title: "Suspension & closing accounts" },
  { id: "law", title: "Governing law" },
  { id: "contact", title: "Changes & contact" },
];

export default function TermsPage() {
  const d = legalDetails();
  const who = d.entity ? `${d.entity} (“${d.brand}”, “we”, “us”)` : `${d.brand} (“we”, “us”)`;

  return (
    <LegalPage
      title="Terms of Use"
      updated={LEGAL_LAST_UPDATED}
      intro="These terms apply when you use the Property Tiger website, WhatsApp service and related tools. Please read them with our Privacy Policy. By using the service or creating an account you agree to them."
      sections={SECTIONS}
    >
      <Section id="about" title="1. About these terms">
        <p style={P}>
          The service is provided by {who}{d.address ? `, ${d.address}` : ""}. You must be at least 18 and able to enter a binding contract to use it.
          If you use it on behalf of a business, you confirm you are authorised to accept these terms for that business.
        </p>
      </Section>

      <Section id="what" title="2. What Property Tiger is — and isn't">
        <ul style={UL}>
          <li>A research and information platform: corridor research, project information, prices measured from listings, official reference values, infrastructure tracking, calculators and alerts.</li>
          <li>Project listings come from developers&apos; published information, public registers such as TG-RERA, and sellers who list with us. We are not the developer or seller of any property shown, and we are not a party to any sale.</li>
          <li>We may pass your enquiry to the developer, seller or a partner who can help you, and we may receive a fee from them. Any agreement you make is between you and them.</li>
          <li>Nothing on the service is legal, tax, financial or investment advice, or an offer to sell. Ratings, scores and scenarios are research aids, not recommendations to buy.</li>
        </ul>
      </Section>

      <Section id="data" title="3. How to read our data">
        <ul style={UL}>
          <li><strong>Prices</strong> are medians of developer price lists in our listings, shown with how many projects they are based on. Asking prices can differ from what buyers finally pay.</li>
          <li><strong>Government guidance values</strong> come from the Telangana Registration &amp; Stamps Department and can change; the department&apos;s own records prevail.</li>
          <li><strong>Forecasts</strong> are scenarios built from published city price data and stated assumptions. They are not predictions or promises, and real outcomes can fall outside every scenario.</li>
          <li><strong>RERA, approval and infrastructure details</strong> are collected from public sources and may be out of date. Always verify with TG-RERA, HMDA/DTCP, the Registration Department and an independent lawyer before paying anything.</li>
        </ul>
        <p style={P}>We work to keep the information accurate and we show sources wherever we can, but we do not guarantee that it is complete, current or error-free.</p>
      </Section>

      <Section id="accounts" title="4. Your account">
        <p style={P}>
          Give accurate details, keep your password private and tell us if you think your account has been misused. You are responsible for activity under
          your account. One person, one account; don&apos;t create accounts for others without their permission.
        </p>
      </Section>

      <Section id="enquiries" title="5. Enquiries">
        <p style={P}>
          When you send an enquiry or request a callback, you agree that we, and the developer, seller or partner concerned, may contact you about it by
          phone, email or WhatsApp. You can ask us to stop at any time — see the <Link href="/legal/privacy" style={A}>Privacy Policy</Link>.
        </p>
      </Section>

      <Section id="sellers" title="6. Listing a property">
        <p style={P}>If you list a property, you confirm that:</p>
        <ul style={UL}>
          <li>you own it or are authorised by the owner to list and sell it;</li>
          <li>the details, price, photos and documents are true, current and yours to share, and you will update or remove the listing when they change;</li>
          <li>the project is registered with TG-RERA where the law requires it, and you have disclosed any dispute, encumbrance or restriction you know of;</li>
          <li>you won&apos;t list anything illegal, misleading or that you have no right to sell.</li>
        </ul>
        <p style={P}>
          You give us a non-exclusive, royalty-free licence to display, format and promote your listing content on the service while it is listed. We may
          review, edit for format, decline or remove any listing, and we may show our own measured price comparisons next to it.
        </p>
      </Section>

      <Section id="use" title="7. Acceptable use">
        <p style={P}>Don&apos;t:</p>
        <ul style={UL}>
          <li>copy, scrape or bulk-download our data, or use it to build a competing database;</li>
          <li>interfere with the service, probe it for weaknesses, or get around access controls or limits;</li>
          <li>post or send anything unlawful, defamatory, misleading or infringing, or spam other users;</li>
          <li>use the service to harass anyone or to collect other people&apos;s personal data.</li>
        </ul>
      </Section>

      <Section id="third" title="8. Third-party content">
        <p style={P}>
          News headlines link to their publishers (see our <Link href="/legal/content-policy" style={A}>content policy</Link>). Map data is © OpenStreetMap
          contributors, and map imagery belongs to its providers. Links to other sites are for convenience; we are not responsible for their content.
        </p>
      </Section>

      <Section id="ip" title="9. Our content">
        <p style={P}>
          The Property Tiger name, logo, design, software, ratings, scores and our own written analysis belong to us or our licensors. You may use the
          service for your own property research; any other use needs our written permission.
        </p>
      </Section>

      <Section id="fees" title="10. Fees">
        <p style={P}>Using the research features is currently free. If we introduce paid features, we will show the price and terms before you pay.</p>
      </Section>

      <Section id="liability" title="11. Disclaimers & liability">
        <p style={P}>
          The service is provided “as is”. To the extent the law allows, we are not liable for decisions you make based on it, for losses arising from a
          transaction with a developer, seller or partner, or for indirect or consequential losses. Where we are liable, our total liability is limited to
          the fees you paid us in the 12 months before the claim (or ₹1,000 if you paid nothing). Nothing in these terms limits liability that cannot be
          limited under Indian law, or your rights under the Consumer Protection Act, 2019.
        </p>
        <p style={P}>
          You agree to compensate us for losses caused by your breach of these terms or by listing content you provide.
        </p>
      </Section>

      <Section id="end" title="12. Suspension & closing accounts">
        <p style={P}>
          You can close your account at any time by contacting us. We may suspend or close accounts, or remove content, that break these terms or the law,
          and we will tell you why unless the law or safety prevents it.
        </p>
      </Section>

      <Section id="law" title="13. Governing law">
        <p style={P}>
          These terms are governed by the laws of India. The courts at Hyderabad, Telangana have jurisdiction, subject to any right you have to approach a
          consumer forum where you live.
        </p>
      </Section>

      <Section id="contact" title="14. Changes & contact">
        <p style={P}>
          We may update these terms; we will change the date above and tell you about significant changes before they apply. Continuing to use the service
          after that means you accept the new terms.
        </p>
        <p style={P}>
          Questions or complaints:{" "}
          {d.contactEmail ? <a href={`mailto:${d.contactEmail}?subject=Terms%20of%20Use`} style={A}>{d.contactEmail}</a> : "please use the contact options on our website"}.
          Grievance Officer{d.grievanceName ? `: ${d.grievanceName}` : ""}
          {d.grievanceEmail ? <> — <a href={`mailto:${d.grievanceEmail}?subject=Grievance`} style={A}>{d.grievanceEmail}</a></> : null}.
        </p>
      </Section>
    </LegalPage>
  );
}
