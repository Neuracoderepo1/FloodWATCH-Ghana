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
