// All records below are SYNTHETIC unit-test inputs to exercise the arithmetic.
// They are not event data and must never be copied into a fixture.
const test = require("node:test");
const assert = require("node:assert/strict");
const { STATUS: S } = require("./floodwatch-risk-quality.js");
const { computeScorecard } = require("./scorecard.js");

const rec = (id, status, impacted, extra = {}) => ({
  id, status, impacted,
  impactSource: impacted === null ? undefined : "synthetic-test",
  hasObservation: false, gridKey: id, ...extra
});

test("rates: detection, missed, false alarm, unrated", () => {
  const r = computeScorecard([
    rec("a", S.HIGH, true), rec("b", S.WATCH, true),
    rec("c", S.NO_ELEVATED_SIGNAL, true), rec("d", S.UNCERTAIN, true),
    rec("e", S.HIGH, false), rec("f", S.HIGH, true), rec("g", S.NO_ELEVATED_SIGNAL, false)
  ], { mode: "hindcast" });
  assert.equal(r.counts.impacted, 5);
  assert.equal(r.detectionRate, 3 / 5);
  assert.equal(r.missedEventRate, 1 / 5);
  assert.equal(r.unratedImpactedRate, 1 / 5);
  assert.equal(r.falseAlarmRate, 1 / 3);
});

test("all-UNCERTAIN output is reported as unrated, not as detection or missed", () => {
  const r = computeScorecard([rec("a", S.UNCERTAIN, true), rec("b", S.UNCERTAIN, false)], { mode: "hindcast" });
  assert.equal(r.detectionRate, 0);
  assert.equal(r.missedEventRate, 0);
  assert.equal(r.unratedImpactedRate, 1);
});

test("rates are null (not 0) when the denominator is empty", () => {
  const r = computeScorecard([rec("a", S.HIGH, null)], { mode: "hindcast" });
  assert.equal(r.detectionRate, null);
  assert.equal(r.falseAlarmRate, null);
  assert.ok(r.warnings.some((w) => /no impacted/.test(w)));
  assert.ok(r.warnings.some((w) => /false alarms cannot be measured/.test(w)));
});

test("impact labels without an independent source are rejected", () => {
  assert.throws(() => computeScorecard([{ ...rec("a", S.HIGH, true), impactSource: "" }], { mode: "hindcast" }), /independent source/);
});

test("shared grid cells are counted once and flagged", () => {
  const r = computeScorecard([rec("a", S.HIGH, true, { gridKey: "5.5,-0.2" }), rec("b", S.HIGH, true, { gridKey: "5.5,-0.2" })], { mode: "hindcast" });
  assert.equal(r.counts.independentGridCells, 1);
  assert.ok(r.warnings.some((w) => /share a grid cell/.test(w)));
});

test("early-warning mode rejects data issued after the cutoff", () => {
  const cutoffAt = "2026-06-28T22:00:00Z";
  const ok = rec("a", S.HIGH, true, { dataIssuedAt: "2026-06-28T21:00:00Z" });
  const late = rec("b", S.HIGH, true, { dataIssuedAt: "2026-06-28T23:30:00Z" });
  assert.doesNotThrow(() => computeScorecard([ok], { mode: "early-warning", cutoffAt }));
  assert.throws(() => computeScorecard([late], { mode: "early-warning", cutoffAt }), /future leakage/);
  assert.throws(() => computeScorecard([rec("c", S.HIGH, true)], { mode: "early-warning", cutoffAt }), /dataIssuedAt/);
  assert.throws(() => computeScorecard([ok], { mode: "early-warning" }), /cutoffAt/);
});

test("lead time is hours from first elevated status to reported impact", () => {
  const r = computeScorecard([
    rec("a", S.HIGH, true, { firstElevatedAt: "2026-06-28T22:00:00Z", impactReportedAt: "2026-06-29T02:00:00Z" }),
    rec("b", S.WATCH, true, { firstElevatedAt: "2026-06-28T22:00:00Z", impactReportedAt: "2026-06-29T04:00:00Z" })
  ], { mode: "hindcast" });
  assert.equal(r.warningLeadTimeHours.n, 2);
  assert.equal(r.warningLeadTimeHours.median, 5);
  assert.equal(r.warningLeadTimeHours.min, 4);
});

test("duplicate ids, unknown statuses and bad modes are rejected", () => {
  assert.throws(() => computeScorecard([rec("a", S.HIGH, null), rec("a", S.HIGH, null)], { mode: "hindcast" }), /duplicate/);
  assert.throws(() => computeScorecard([rec("a", "Low", null)], { mode: "hindcast" }), /unknown status/);
  assert.throws(() => computeScorecard([], { mode: "nope" }), /mode/);
});

// ---- "no inventory record" evidence class (SYNTHETIC records only) ----
const inv = [{ name: "synthetic-inventory", url: "https://example.invalid/inv", searchedAt: "2026-10-23", coverageStart: "2018-01-01", coverageEnd: "2026-06-27" }];
const weak = (id, status, extra = {}) => ({
  id, status, impacted: false, impactEvidence: "no_inventory_record",
  date: "2024-05-10", inventorySources: inv, hasObservation: true, gridKey: id, ...extra
});

test("false alarm: confirmed rate and weaker upper bound are reported separately", () => {
  const r = computeScorecard([
    rec("synthetic-a", S.HIGH, true),                 // confirmed hit
    rec("synthetic-b", S.HIGH, false),                // confirmed false alarm
    weak("synthetic-c", S.HIGH),                      // High on a no-inventory-record day
    weak("synthetic-d", S.UNCERTAIN)                  // not rated High, must not matter
  ], { mode: "hindcast" });
  assert.equal(r.falseAlarmRate, 1 / 2);                                  // 1 of 2 confirmed-labelled Highs
  assert.equal(r.falseAlarmRateUpperBoundIncludingNoInventory, 2 / 3);    // adds the weak High to both sides
  assert.match(r.falseAlarmNotes, /weaker evidence/);
});

test("no-inventory records never count as confirmed non-impact or touch detection/missed rates", () => {
  const r = computeScorecard([rec("synthetic-a", S.HIGH, true), weak("synthetic-b", S.NO_ELEVATED_SIGNAL)], { mode: "hindcast" });
  assert.equal(r.counts.notImpacted, 0);
  assert.equal(r.counts.noInventoryRecord, 1);
  assert.equal(r.counts.labelled, 1);
  assert.equal(r.counts.unlabelled, 0);
  assert.equal(r.detectionRate, 1);
  assert.equal(r.missedEventRate, 0);
  assert.ok(r.warnings.some((w) => /confirmed false alarms cannot be measured/.test(w)));
  assert.ok(r.warnings.some((w) => /upper bound/.test(w)));
});

test("confirmed false-alarm rate stays null (not 0) when only weak negatives exist", () => {
  const r = computeScorecard([weak("synthetic-a", S.HIGH), weak("synthetic-b", S.HIGH)], { mode: "hindcast" });
  assert.equal(r.falseAlarmRate, null);
  assert.equal(r.falseAlarmRateUpperBoundIncludingNoInventory, 1);
});

test("no_inventory_record is rejected without a documented search", () => {
  const run = (x) => computeScorecard([weak("synthetic-a", S.HIGH, x)], { mode: "hindcast" });
  assert.throws(() => run({ inventorySources: undefined }), /inventorySources/);
  assert.throws(() => run({ inventorySources: [] }), /inventorySources/);
  assert.throws(() => run({ inventorySources: [{ name: "x" }] }), /needs name, url/);
  assert.throws(() => run({ date: undefined }), /requires date/);
  assert.throws(() => run({ date: "10/05/2024" }), /requires date/);
  assert.throws(() => run({ impacted: true }), /requires impacted === false/);
  assert.throws(() => run({ impactEvidence: "vibes" }), /unknown impactEvidence/);
});

test("no_inventory_record is rejected when the date is outside the inventory's coverage", () => {
  assert.throws(() => computeScorecard([weak("synthetic-a", S.HIGH, { date: "2026-06-29" })], { mode: "hindcast" }), /outside the coverage window/);
  assert.throws(() => computeScorecard([weak("synthetic-a", S.HIGH, { date: "2017-12-31" })], { mode: "hindcast" }), /outside the coverage window/);
  assert.doesNotThrow(() => computeScorecard([weak("synthetic-a", S.HIGH, { date: "2026-06-27" })], { mode: "hindcast" }));
});

test("a confirmed label still needs an independent source even when weak records exist", () => {
  assert.throws(() => computeScorecard([{ ...rec("synthetic-a", S.HIGH, false), impactSource: "" }, weak("synthetic-b", S.HIGH)], { mode: "hindcast" }), /independent source/);
});
