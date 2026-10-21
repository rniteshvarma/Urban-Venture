import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseMonthYear, parsePriceLakh, reraNumbersIn } from "./text";
import { configUnits, parseRoofAndFloor, specItems } from "./roofandfloor";
import { foundingYear, parseHomes247, transferState } from "./homes247";
import { landRejection, parseOneAcre, readOneAcre, rscRows } from "./oneacre";
import { describe as describeRecord } from "../record";

// ── minimal pages in each source's real markup ────────────────────────────────

const RF = `
<script type="application/ld+json">{"@context":"https://schema.org","@type":["ApartmentComplex","Product"],"name":"Lake View","geo":{"@type":"GeoCoordinates","latitude":"17.4857919","longitude":"78.3526736"},"offers":{"@type":"AggregateOffer","lowPrice":"8942000","highPrice":"14500000","seller":{"@type":"Organization","name":"Vasavi Group"}}}</script>
<h1 class="pd-project-name">Lake View</h1>
<div class="pd-spec-item"><span class="pd-spec-lbl">Property Type</span> <span class="pd-spec-val pd-spec-rera"><a href="x">Flats</a> </span> </div>
<div class="pd-spec-item"><span class="pd-spec-lbl">Project Location</span> <span class="pd-spec-val pd-spec-rera">Hafeezpet, Hyderabad</span> </div>
<div class="pd-spec-item"><span class="pd-spec-lbl">Total Land Area</span> <span class="pd-spec-val">17 Acres</span> </div>
<div class="pd-spec-item"><span class="pd-spec-lbl">Total Units</span> <span class="pd-spec-val">1845</span> </div>
<div class="pd-spec-item"><span class="pd-spec-lbl">Possession</span> <span class="pd-spec-val">Dec, 2027</span> </div>
<div class="pd-spec-item"><span class="pd-spec-lbl">Total Blocks</span> <span class="pd-spec-val">13</span> </div>
<div class="pd-spec-item"><span class="pd-spec-lbl">RERA No</span> <span class="pd-spec-val pd-spec-rera"> P02500001821</span> </div>
<table class="pd-config-table"><thead><tr><th>Configuration</th><th>Size</th><th>Price*</th></tr></thead><tbody>
<tr><td class="td-config">2 BHK Flats</td><td>1225 - 1245</td><td class="td-price">89.42 L - 90.88 L * </td></tr>
<tr><td class="td-config">3 BHK Flats</td><td>1995</td><td>1.45 Cr * </td></tr>
</tbody></table>
<p class="pd-highlight-desc"> Address: Manjeera Pipeline Road, Hafeezpet, Hyderabad, Telangana 500050, India. </p>
<div class="pd-amenity-item"><div class="pd-amenity-icon"></div><span>Gym</span></div>
<span data-amen-name="Gym"></span><span data-amen-name="Cricket Net"></span>
<img src="project/552/gallery/Lake_1.jpg?auto=compress&w=200"><img src="project/552/gallery/Lake_2.jpg">
<div class="pd-floor-plan-item" data-fp-label="2 BHK" data-fp-size="1225 sq.ft." data-fp-img="project/552/floorplan/2138_twobhk_1225_2 bhk.jpg"></div>`;
const RF_URL = "https://www.roofandfloor.com/hyderabad/project/lake-view-in-hafeezpet/552";

const h247State = (over: Record<string, unknown> = {}) => {
  const state = {
    prop_new_test_9: { details: [{ propertyName: "Sky Homes", BuilderName: "Acme Builders", locality_name: "Kokapet", propertyType: "Apartments", RERA_ID: "P02400001234", Status: "Under Construction", PossessionDate: "2028-06-30", latitude: "17.40", longitude: "78.33", min_price: "8000000", max_price: "12000000", dimension: "3.5", total_apartments: "300", masterImgPath: "masterplan.jpg", images: [{ name: "coverimg.jpg" }, { name: "1650-sky homes.jpg" }], ...over }] },
    amen_banks_test_9: { details: [{ Amenities_Details: [{ Name: "Gym" }], Approvals_Details: [{ Name: "HMDA" }], BHK_Details: [
      { BHK: "2 BHK", Areaconverted: "1200", Price: "80 L", FloorImage: "fp-2bhk.jpg" },
      { BHK: "3 BHK", Areaconverted: "1700", Price: "1.2 Cr", FloorImage: "No floor plan.jpg" },
      { BHK: "3 BHK", Areaconverted: "1750", Price: "3 Cr", FloorImage: null },
    ], images: [] }] },
    prop_desc_test_9: { descriptions: [{ Builder_details: [{ builderdesc: "<p>Acme was founded by A. Rao in 1996 in Hyderabad.</p>" }] }] },
  };
  return `<script id="serverApp-state" type="application/json">${JSON.stringify(state).replace(/"/g, "&q;")}</script>`;
};
const H_URL = "https://www.homes247.in/property/hyderabad/kokapet/sky-homes-9";

/** An RSC payload as 1acre streams it. */
function rsc(rows: Record<string, unknown>): string {
  const text = Object.entries(rows).map(([k, v]) => `${k}:${JSON.stringify(v)}`).join("\n");
  return `<script>self.__next_f.push([1,${JSON.stringify(text)}])</script>`;
}
const LAND_SLUG = "5-acre-land-in-parveda-shankarpalle-ranga-reddy-telangana-17608";
const landRows = (over: Record<string, unknown> = {}) =>
  rsc({
    "44": ["$46", "$47", "$48"],
    "46": { id: 1, name: "Ranga Reddy", division_type: "district" },
    "47": { id: 2, name: "Shankarpalle", division_type: "mandal" },
    "48": { id: 3, name: "Parveda", division_type: "village" },
    "58": { total_land_size_in_acres: "$59" },
    "59": { acres: 5, guntas: 20, cents: null },
    "3d": {
      id: 17608, land_media: "$3e", division_info: "$44", seller: "$4e", slug: LAND_SLUG, is_basic_verified: true, is_exact: false,
      total_price: 1100, price_per_acre: 200, total_land_size: 5.5, land_size: "$58", lat: "17.40", long: "78.07",
      status: "active", verification_status: "approved", is_physically_verified: false, approach_road: true,
      created_at: "2026-09-01T00:00:00Z", survey_number: "61",
      ...over,
    },
    "4e": { id: 9, name: "A Seller Person", seller_type: "agent" },
  });
const LAND_URL = `https://1acre.in/lands-for-sale/${LAND_SLUG}`;
const NOW = new Date("2026-10-21T00:00:00Z");

describe("source text helpers", () => {
  test("prices in lakh and crore", () => {
    assert.equal(parsePriceLakh("89.42 L"), 89.42);
    assert.equal(parsePriceLakh("1.13 Cr"), 113);
    assert.equal(parsePriceLakh("₹ 2,50,00,000"), 250);
    assert.equal(parsePriceLakh("Price on Request"), null);
  });
  test("possession months", () => {
    assert.equal(parseMonthYear("Dec, 2027"), "2027-12-01");
    assert.equal(parseMonthYear("August-2020"), "2020-08-01");
    assert.equal(parseMonthYear("2028-06-30"), "2028-06-01");
    assert.equal(parseMonthYear("Ready to Occupy"), null);
  });
  test("TG-RERA project numbers only", () => {
    assert.deepEqual(reraNumbersIn(" P02500001821, p02400000466 "), ["P02500001821", "P02400000466"]);
    assert.deepEqual(reraNumbersIn("REA02400000247 / NA"), []);
  });
});

describe("RoofandFloor", () => {
  test("spec items, including ones with extra classes and leading spaces", () => {
    const s = specItems(RF);
    assert.equal(s["Property Type"], "Flats");
    assert.equal(s["RERA No"], "P02500001821");
  });
  test("units at each listed end of the configuration ranges", () => {
    const u = configUnits(RF, "Apartment");
    assert.deepEqual(u.map((x) => [x.label, x.builtUpSqFt, x.priceLakh, x.ratePerSqFt]), [["2 BHK", 1225, 89.42, 7300], ["2 BHK", 1245, 90.88, 7300], ["3 BHK", 1995, 145, 7268]]);
  });
  test("a full record, with floor-plan links URL-encoded and pop-up amenities", () => {
    const r = parseRoofAndFloor(RF, RF_URL, { accessed: "2026-10-21", established: () => 1994 });
    assert.ok(r.ok);
    const rec = r.record;
    assert.equal(rec.key, "roofandfloor:552");
    assert.equal(rec.developer, "Vasavi Group");
    assert.equal(rec.developerEstablished, 1994);
    assert.equal(rec.status, "UNDER_CONSTRUCTION");
    assert.equal(rec.possessionTarget, "2027-12-01");
    assert.deepEqual(rec.reraNumbers, ["P02500001821"]);
    assert.deepEqual(rec.floorPlans, ["https://www.roofandfloor.com/project/552/floorplan/2138_twobhk_1225_2%20bhk.jpg"]);
    assert.deepEqual(rec.images, ["https://www.roofandfloor.com/project/552/gallery/Lake_1.jpg", "https://www.roofandfloor.com/project/552/gallery/Lake_2.jpg"]);
    assert.deepEqual(rec.amenities, ["Gym", "Cricket Net"]);
    assert.equal(rec.priceMinLakh, 89.42);
    assert.equal(rec.priceMaxLakh, 145);
    assert.match(rec.description, /RERA-registered apartment project by Vasavi Group \(est\. 1994\) in Hafeezpet/);
    assert.match(rec.description, /Expected possession: Dec 2027\./);
  });
  test("unknown property types are rejected, not guessed", () => {
    const r = parseRoofAndFloor(RF.replace(">Flats<", ">Farm Houses<"), RF_URL, { accessed: "2026-10-21" });
    assert.equal(r.ok, false);
  });
});

describe("Homes247", () => {
  test("decodes the transfer state", () => {
    assert.ok(transferState(h247State()));
    assert.equal(transferState("<html></html>"), null);
  });
  test("a unit priced outside the project's own range is withheld; placeholder images dropped", () => {
    const r = parseHomes247(h247State(), H_URL, { accessed: "2026-10-21" });
    assert.ok(r.ok);
    const rec = r.record;
    assert.deepEqual(rec.units.map((u) => u.priceLakh), [80, 120, null]);
    assert.ok(rec.flags.includes("UNIT_PRICE_WITHHELD"));
    assert.deepEqual(rec.images, ["https://img-db.homes247.in/images/uploadPropertyImgs/1650-sky%20homes.jpg"]);
    assert.deepEqual(rec.masterPlans, []);
    assert.deepEqual(rec.floorPlans, ["https://img-db.homes247.in/images/uploadBHKImgs/fp-2bhk.jpg"]);
    assert.equal(rec.developerEstablished, 1996);
    assert.equal(rec.possessionTarget, "2028-06-01");
    assert.deepEqual(rec.approvals, ["HMDA"]);
  });
  test("no TG-RERA number → rejected", () => {
    const r = parseHomes247(h247State({ RERA_ID: "NA" }), H_URL, { accessed: "2026-10-21" });
    assert.equal(r.ok, false);
  });
  test("founding years only from explicit wording", () => {
    assert.equal(foundingYear("Established in 1994, the group…"), 1994);
    assert.equal(foundingYear("Delivered 40 projects by 2020"), null);
  });
});

describe("1acre land listings", () => {
  test("reads the streamed rows and resolves references", () => {
    assert.ok(rscRows(landRows()).size >= 5);
    const l = readOneAcre(landRows(), LAND_URL)!;
    assert.equal(l.kind, "land");
    assert.equal(l.acres, 5.5);
    assert.equal(l.totalPriceLakh, 1100);
    assert.equal(l.mandal, "Shankarpalle");
    assert.equal(l.village, "Parveda");
  });
  test("strict filters", () => {
    const base = readOneAcre(landRows(), LAND_URL)!;
    assert.equal(landRejection(base, NOW), null);
    assert.match(landRejection({ ...base, createdAt: "2025-09-01T00:00:00Z" }, NOW)!, /12 months/);
    assert.match(landRejection({ ...base, basicVerified: false }, NOW)!, /not verified/);
    assert.match(landRejection({ ...base, totalPriceLakh: null }, NOW)!, /no price/);
    assert.match(landRejection({ ...base, status: "sold" }, NOW)!, /status/);
  });
  test("the record says it isn't RERA and carries nothing about the seller", () => {
    const r = parseOneAcre(landRows(), LAND_URL, { accessed: "2026-10-21", now: NOW });
    assert.ok(r.ok);
    const rec = r.record;
    assert.equal(rec.listingKind, "LAND_LISTING");
    assert.equal(rec.developer, "Individual seller");
    assert.deepEqual(rec.images, []);
    assert.ok(rec.flags.includes("NOT_RERA") && rec.flags.includes("LOCATION_APPROXIMATE"));
    assert.equal(rec.units[0].category, "LAND");
    assert.equal(rec.units[0].plotSqYd, 26620);
    assert.ok(!JSON.stringify(rec).includes("A Seller Person"));
    assert.match(rec.description, /not a RERA-registered project/);
  });
  test("plot listings keep seller-stated layout details, labelled as such", () => {
    const html = rsc({
      "42": [],
      "3d": { id: 2401, plot_media: "$3e", division_info: "$42", slug: "150-sqyd-plot-x-telangana-2401", is_basic_verified: true, total_price: 4999950, price_per_square_yard: 33333, total_plot_size: 150, total_plot_size_unit: "square_yard", lat: "17.3", long: "78.2", status: "active", verification_status: "approved", created_at: "2026-05-01T00:00:00Z", layout_type: "approved", lp_number: "LP 12/2019", lrs_obtained: true },
    });
    const r = parseOneAcre(html, "https://1acre.in/lands-for-sale/150-sqyd-plot-x-telangana-2401", { accessed: "2026-10-21", now: NOW });
    assert.ok(r.ok);
    assert.equal(r.record.propertyType, "Plots");
    assert.equal(r.record.priceMinLakh, 50);
    assert.deepEqual(r.record.approvals, ["Seller-stated layout: approved", "LP number LP 12/2019", "LRS obtained (seller-stated)"]);
    assert.match(describeRecord(r.record), /A 150 sq\.yd plot for sale/);
  });
});
