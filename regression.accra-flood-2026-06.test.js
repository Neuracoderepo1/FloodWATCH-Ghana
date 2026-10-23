/**
 * Accra flood (28-29 June 2026) regression + integration tests.
 *
 * Exercises the SAME path the dashboard uses:
 *   FloodWatchInputs.buildClassifierInput -> FloodWatchRiskQuality.classifyFloodStatus
 *
 * Part A runs today (no event data needed): integrated-path safety invariants.
 * Part B needs fixtures/accra-flood-2026-06.json and is SKIPPED (not passed) until it exists.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { STATUS, classifyFloodStatus } = require("./floodwatch-risk-quality.js");
const { VALIDATION, buildClassifierInput } = require("./floodwatch-inputs.js");

const dashboard = (live, ts = live) =>
  classifyFloodStatus(buildClassifierInput({ live, hasSourceTimestamp: ts }));

// ---------- Part A: integrated-path invariants ----------

test("no validation gate is claimed as passed in the shipped configuration", () => {
  for (const [gate, v] of Object.entries(VALIDATION)) {
    assert.equal(v, false, `${gate} must stay false until real validation is documented`);
  }
});

test("live data with all current gates still yields UNCERTAIN, never a rating", () => {
  const r = dashboard(true);
  assert.equal(r.status, STATUS.UNCERTAIN);
  for (const gate of Object.keys(VALIDATION)) assert.ok(r.missingRequirements.includes(gate), gate);
  assert.ok(!r.missingRequirements.includes("dataFresh"));
});

test("sample/offline data is UNCERTAIN and flags stale data", () => {
  const r = dashboard(false);
  assert.equal(r.status, STATUS.UNCERTAIN);
  assert.ok(r.missingRequirements.includes("dataFresh"));
  assert.ok(r.missingRequirements.includes("sourceTimestampAvailable"));
});

test("a heavy-rain score cannot produce High/Watch through the dashboard path", () => {
  const r = classifyFloodStatus(buildClassifierInput({
    live: true, hasSourceTimestamp: true, riskScore: 0.99, thresholds: { watch: 0.35, high: 0.65 }
  }));
  assert.equal(r.status, STATUS.UNCERTAIN);
});

test("a zero-rain score cannot produce a reassuring status through the dashboard path", () => {
  const r = classifyFloodStatus(buildClassifierInput({
    live: true, hasSourceTimestamp: true, riskScore: 0, thresholds: { watch: 0.35, high: 0.65 }
  }));
  assert.equal(r.status, STATUS.UNCERTAIN);
  assert.notEqual(r.status, STATUS.NO_ELEVATED_SIGNAL);
});

test("verified official alert and confirmed incident survive the adapter", () => {
  const a = classifyFloodStatus(buildClassifierInput({
    live: false, official: { active: true, sourceVerified: true, sourceName: "NADMO" }, riskScore: 0
  }));
  assert.equal(a.status, STATUS.EMERGENCY_ALERT);
  const c = classifyFloodStatus(buildClassifierInput({ live: false, confirmedIncident: true, riskScore: 0 }));
  assert.equal(c.status, STATUS.CONFIRMED_INCIDENT);
});

test("unverified official-looking alert does not trigger an emergency status", () => {
  const r = classifyFloodStatus(buildClassifierInput({
    live: true, hasSourceTimestamp: true, official: { active: true, sourceVerified: false }
  }));
  assert.notEqual(r.status, STATUS.EMERGENCY_ALERT);
});

test("dashboard source no longer contains the legacy Low/Watch/High rainfall classifier", () => {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  assert.ok(!/function tier\(/.test(html), "legacy tier() still present");
  assert.ok(!/function final\(/.test(html), "legacy final() still present");
  assert.ok(/FloodWatchRiskQuality/.test(html) && /classifyFloodStatus/.test(html));
  assert.ok(/floodwatch-risk-quality\.js/.test(html) && /floodwatch-inputs\.js/.test(html));
});

// ---------- Part B: back-test fixture (28-29 June 2026 event) ----------

const fixturePath = path.join(__dirname, "fixtures", "accra-flood-2026-06.json");
const skip = fs.existsSync(fixturePath) ? false : "fixtures/accra-flood-2026-06.json not provided — no event data available";
const load = () => JSON.parse(fs.readFileSync(fixturePath, "utf8"));

test("event: no independently confirmed impacted location is rated reassuring", { skip }, () => {
  const impacted = load().locations.filter((l) => l.impacted === true);
  assert.ok(impacted.length > 0, "fixture has no cited impacted locations");
  for (const l of impacted) {
    const r = classifyFloodStatus(buildClassifierInput({ live: l.dataFresh === true, hasSourceTimestamp: !!l.dataIssuedAt }));
    assert.notEqual(r.status, STATUS.NO_ELEVATED_SIGNAL, l.id);
  }
});

test("event: every location is UNCERTAIN until validation gates are legitimately met", { skip }, () => {
  for (const l of load().locations) {
    const r = classifyFloodStatus(buildClassifierInput({ live: l.dataFresh === true, hasSourceTimestamp: !!l.dataIssuedAt }));
    assert.equal(r.status, STATUS.UNCERTAIN, l.id);
  }
});

test("event: fixture passes scorecard validation (sources cited, no leakage, grid cells recorded)", { skip }, () => {
  const fx = load();
  const records = fx.locations.map((l) => ({
    id: l.id, status: STATUS.UNCERTAIN, impacted: l.impacted === undefined ? null : l.impacted,
    impactSource: l.impactSource, dataIssuedAt: l.dataIssuedAt,
    hasObservation: l.hasObservation === true, gridKey: l.gridKey
  }));
  assert.doesNotThrow(() => require("./scorecard.js").computeScorecard(records, { mode: fx.mode, cutoffAt: fx.cutoffAt }));
});
