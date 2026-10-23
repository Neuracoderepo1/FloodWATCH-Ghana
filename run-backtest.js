#!/usr/bin/env node
/**
 * Usage: node run-backtest.js [fixtures/accra-flood-2026-06.json]
 *
 * Exits 2 (not 0) when the fixture is absent, so a missing back-test is never
 * mistaken for a passing one. Statuses are produced by the real dashboard path
 * (adapter -> classifier); this script never assigns a status or an impact label.
 */
const fs = require("node:fs");
const path = require("node:path");
const { classifyFloodStatus } = require("./floodwatch-risk-quality.js");
const { buildClassifierInput } = require("./floodwatch-inputs.js");
const { computeScorecard } = require("./scorecard.js");

const file = process.argv[2] || path.join(__dirname, "fixtures", "accra-flood-2026-06.json");
if (!fs.existsSync(file)) {
  console.error(`No back-test fixture at ${file}.\nSee fixtures/README.md. Nothing was scored.`);
  process.exit(2);
}
const fx = JSON.parse(fs.readFileSync(file, "utf8"));
const records = fx.locations.map((l) => ({
  id: l.id,
  status: classifyFloodStatus(buildClassifierInput({
    live: l.dataFresh === true,
    hasSourceTimestamp: !!l.dataIssuedAt,
    official: l.officialAlert,
    confirmedIncident: l.confirmedIncident === true,
    unverifiedReport: l.unverifiedReport === true
    // riskScore / thresholds intentionally not supplied: none is validated yet.
  })).status,
  impacted: l.impacted === undefined ? null : l.impacted,
  impactSource: l.impactSource,
  impactReportedAt: l.impactReportedAt,
  firstElevatedAt: l.firstElevatedAt,
  dataIssuedAt: l.dataIssuedAt,
  hasObservation: l.hasObservation === true,
  gridKey: l.gridKey
}));
const result = computeScorecard(records, { mode: fx.mode, cutoffAt: fx.cutoffAt });
console.log(JSON.stringify({ event: fx.event, ...result }, null, 2));
