/**
 * What to check before buying, by kind of purchase. Each item names the
 * document or record and where to see it. These are general checks for
 * Telangana, not legal advice about a specific property.
 */
import type { PurchaseKind } from "./costs";

export interface CheckItem {
  title: string;
  why: string;
  where?: { label: string; url: string };
}

const RERA = { label: "TG-RERA", url: "https://rera.telangana.gov.in" };
const BHU = { label: "Bhu Bharati", url: "https://bhubharati.telangana.gov.in" };
const REG = { label: "Registration & Stamps Dept", url: "https://registration.telangana.gov.in" };
const BUILDNOW = { label: "BuildNow citizen search", url: "https://app.buildnow.telangana.gov.in/citizen-search" };

const EC: CheckItem = { title: "Encumbrance Certificate (30 years)", why: "Shows every registered sale and mortgage on the property, so you can see the ownership chain and any loan still on it.", where: REG };
const TITLE: CheckItem = { title: "Title documents and a lawyer's title opinion", why: "The chain of sale deeds back at least 30 years, read by a property lawyer, is the only real check that the seller can sell." };
const PROHIBITED: CheckItem = { title: "Not on the prohibited-properties list (Section 22-A)", why: "Government, assigned, endowment, Wakf and ceiling-surplus land can't be registered to you.", where: BHU };

export const CHECKLISTS: Record<PurchaseKind | "resale_plot", { label: string; items: CheckItem[] }> = {
  apartment: {
    label: "Apartment",
    items: [
      { title: "TG-RERA registration and its completion date", why: "Under-construction projects must be registered; the certificate shows the promised completion date and any extension.", where: RERA },
      { title: "Approved building plan", why: "The permission number from GHMC or HMDA should match the towers and floors being built.", where: BUILDNOW },
      { title: "Undivided share of land (UDS) in your agreement", why: "Your share of the land should be stated; the shares of all flats together shouldn't exceed the plot." },
      { title: "Sale agreement terms", why: "Under RERA the developer can't take more than 10% of the price before a registered agreement for sale (Section 13), and owes interest for delayed possession (Section 18). Check the agreement says so.", where: RERA },
      { title: "Occupancy certificate (ready flats)", why: "Without it the building isn't approved for living in, and utilities and loans can be refused." },
      { title: "Bank approvals for the project", why: "Banks that have approved the project for loans have done some legal checks of their own." },
      EC,
    ],
  },
  villa: {
    label: "Villa",
    items: [
      { title: "TG-RERA registration", why: "Gated villa projects over 500 sq.m or 8 units must be registered.", where: RERA },
      { title: "Approved layout and building permission", why: "Both the layout (LP number) and your villa's building plan should be approved.", where: BUILDNOW },
      { title: "Plot area and boundaries in the sale deed", why: "The villa's plot should be conveyed to you with its survey and plot number, not just the built-up area." },
      EC,
      TITLE,
    ],
  },
  plot: {
    label: "Plot in a layout",
    items: [
      { title: "Layout permission (LP) number", why: "An HMDA or DTCP-approved layout is needed for building permission later; check the LP number and the plot count.", where: BUILDNOW },
      { title: "TG-RERA registration (new layouts)", why: "Layouts over 500 sq.m or 8 plots must be registered before they're sold.", where: RERA },
      { title: "Conversion from farm land (NALA)", why: "Plots must be on land converted to non-agricultural use.", where: BHU },
      { title: "Plot isn't in a road, park or lake buffer", why: "Compare the plot with the approved layout map, and check lake Full Tank Level and buffer zones." },
      PROHIBITED,
      EC,
    ],
  },
  resale_plot: {
    label: "Resale plot",
    items: [
      { title: "Layout approval or LRS", why: "Ask for the LP number of the layout, or the Layout Regularisation Scheme (LRS) order if it was regularised.", where: BUILDNOW },
      { title: "Seller's sale deed and link documents", why: "The seller's own deed, and the deeds before it back to the layout owner." },
      PROHIBITED,
      EC,
      TITLE,
    ],
  },
  land: {
    label: "Farm land / land parcel",
    items: [
      { title: "Record of rights on Bhu Bharati", why: "The pattadar passbook name, survey number and extent should match the seller and what's being sold; check for pending mutation or disputes.", where: BHU },
      PROHIBITED,
      { title: "Not assigned or ceiling land", why: "Land assigned to landless families, or surplus under land-ceiling law, generally can't be sold." },
      { title: "Survey sketch and boundaries", why: "Get the survey map (tippan) and have the boundaries measured on the ground." },
      { title: "Land use in the master plan", why: "Inside the HMDA area, the master plan zone (residential, agricultural, conservation) decides what you can build." },
      { title: "Conversion (NALA) for non-farm use", why: "Building anything other than farm structures needs the land converted to non-agricultural use.", where: BHU },
      EC,
      TITLE,
    ],
  },
  commercial: {
    label: "Commercial property",
    items: [
      { title: "TG-RERA registration", why: "Commercial projects are covered by RERA too.", where: RERA },
      { title: "Building permission for commercial use", why: "The approved plan should allow shops or offices on that floor." },
      { title: "Occupancy certificate and fire safety approval", why: "Needed to open for business and for insurance." },
      { title: "Zoning of the site", why: "The master plan zone must allow commercial use." },
      EC,
      TITLE,
    ],
  },
};

export function checklistFor(kind: PurchaseKind, isLandListing: boolean) {
  return kind === "plot" && isLandListing ? CHECKLISTS.resale_plot : CHECKLISTS[kind];
}
