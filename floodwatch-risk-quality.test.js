const test = require("node:test");
const assert = require("node:assert/strict");
const { STATUS, classifyFloodStatus } = require("./floodwatch-risk-quality.js");

const completeQuality = {
  dataFresh: true,
  spatialCoverageAdequate: true,
  modelValidatedAgainstMultipleEvents: true,
  exposureDataValidated: true,
  hydrologyDataValidated: true,
  thresholdsEventValidated: true,
  sourceTimestampAvailable: true
};
const calibrated = {
  quality: completeQuality,
  thresholds: { watch: 0.35, high: 0.65 }
};

test("verified official alert takes precedence over a low model score", () => {
  const result = classifyFloodStatus({
    ...calibrated,
    riskScore: 0.01,
    officialAlert: { active: true, sourceVerified: true, sourceName: "Test Authority" }
  });
  assert.equal(result.status, STATUS.EMERGENCY_ALERT);
});

test("confirmed incident cannot be downgraded by low model score", () => {
  assert.equal(classifyFloodStatus({
    ...calibrated, riskScore: 0.01, confirmedIncident: true
  }).status, STATUS.CONFIRMED_INCIDENT);
});

test("unverified report is not dismissed by model score", () => {
  assert.equal(classifyFloodStatus({
    ...calibrated, riskScore: 0.01, unverifiedReport: true
  }).status, STATUS.UNVERIFIED_REPORT);
});

test("missing/stale data returns uncertain, not low", () => {
  const result = classifyFloodStatus({
    ...calibrated,
    riskScore: 0.01,
    quality: { ...completeQuality, dataFresh: false }
  });
  assert.equal(result.status, STATUS.UNCERTAIN);
  assert.ok(result.missingRequirements.includes("dataFresh"));
});

test("model score alone cannot produce reassuring status", () => {
  assert.equal(classifyFloodStatus({ riskScore: 0.01 }).status, STATUS.UNCERTAIN);
});

test("poor spatial coverage returns uncertain", () => {
  assert.equal(classifyFloodStatus({
    ...calibrated, riskScore: 0.01,
    quality: { ...completeQuality, spatialCoverageAdequate: false }
  }).status, STATUS.UNCERTAIN);
});

test("high calibrated score produces High only when all validation gates pass", () => {
  assert.equal(classifyFloodStatus({ ...calibrated, riskScore: 0.8 }).status, STATUS.HIGH);
});

test("watch calibrated score produces Watch only when all validation gates pass", () => {
  assert.equal(classifyFloodStatus({ ...calibrated, riskScore: 0.5 }).status, STATUS.WATCH);
});

test("low calibrated score uses non-guaranteeing wording", () => {
  const result = classifyFloodStatus({ ...calibrated, riskScore: 0.1 });
  assert.equal(result.status, STATUS.NO_ELEVATED_SIGNAL);
  assert.match(result.disclaimer, /does not mean flooding is impossible/i);
});

test("invalid threshold order returns uncertain", () => {
  assert.equal(classifyFloodStatus({
    ...calibrated, riskScore: 0.1,
    thresholds: { watch: 0.7, high: 0.6 }
  }).status, STATUS.UNCERTAIN);
});
