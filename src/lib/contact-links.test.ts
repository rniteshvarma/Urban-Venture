import { test } from "node:test";
import assert from "node:assert/strict";
import { whatsappLink, whatsappNumber } from "./contact-links";

test("no number configured means no link", () => {
  assert.equal(whatsappNumber(undefined), null);
  assert.equal(whatsappNumber(""), null);
  assert.equal(whatsappLink("Hi", ""), null);
  assert.equal(whatsappLink("Hi", "12345"), null, "too short to be a number");
});

test("the link carries the number as digits and the text encoded", () => {
  assert.equal(whatsappNumber("+91 98765 43210"), "919876543210");
  assert.equal(whatsappLink('About "Sky Towers" & more', "+91 98765 43210"), "https://wa.me/919876543210?text=About%20%22Sky%20Towers%22%20%26%20more");
});
