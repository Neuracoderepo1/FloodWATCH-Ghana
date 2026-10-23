/**
 * FloodWatch Ghana — conservative flood-status decision helper.
 *
 * IMPORTANT:
 * - Rainfall-model output alone is not a validated flood forecast.
 * - Do not call FloodWatch-generated statuses "official warnings".
 * - Official alerts and confirmed incidents override model scores.
 * - Without validated model, exposure/hydrology inputs, fresh data,
 *   adequate coverage and event-validated thresholds, return UNCERTAIN.
 *
 * This module is deliberately not wired into the deployed UI. The live
 * Netlify deploy is a manual static upload and its canonical source is absent
 * from the connected GitHub repository. Integrate only after review.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FloodWatchRiskQuality = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const STATUS = Object.freeze({
    EMERGENCY_ALERT: "Emergency alert — official source",
    CONFIRMED_INCIDENT: "Confirmed incident — urgent action",
    UNVERIFIED_REPORT: "Unverified report — verify promptly",
    HIGH: "High",
    WATCH: "Watch",
    NO_ELEVATED_SIGNAL: "No elevated signal detected",
    UNCERTAIN: "Risk uncertain — data insufficient"
  });

  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function classifyFloodStatus(input = {}) {
    const official = input.officialAlert || {};
    if (official.active === true && official.sourceVerified === true) {
      return {
        status: STATUS.EMERGENCY_ALERT,
        reason: "A current alert from a verified official source takes precedence over model output.",
        canOverrideWithModel: false,
        source: official.sourceName || "Verified official source"
      };
    }

    if (input.confirmedIncident === true) {
      return {
        status: STATUS.CONFIRMED_INCIDENT,
        reason: "A confirmed incident must not be downgraded by a low model score.",
        canOverrideWithModel: false
      };
    }

    if (input.unverifiedReport === true) {
      return {
        status: STATUS.UNVERIFIED_REPORT,
        reason: "A report is present but has not been verified; do not dismiss it using a model score.",
        canOverrideWithModel: false
      };
    }

    const quality = input.quality || {};
    const requirements = [
      ["dataFresh", quality.dataFresh === true],
      ["spatialCoverageAdequate", quality.spatialCoverageAdequate === true],
      ["modelValidatedAgainstMultipleEvents", quality.modelValidatedAgainstMultipleEvents === true],
      ["exposureDataValidated", quality.exposureDataValidated === true],
      ["hydrologyDataValidated", quality.hydrologyDataValidated === true],
      ["thresholdsEventValidated", quality.thresholdsEventValidated === true],
      ["sourceTimestampAvailable", quality.sourceTimestampAvailable === true]
    ];
    const missing = requirements.filter(([, ok]) => !ok).map(([name]) => name);

    if (missing.length > 0) {
      return {
        status: STATUS.UNCERTAIN,
        reason: "The available inputs are not sufficient for a defensible flood-risk classification.",
        missingRequirements: missing,
        canOverrideWithModel: false
      };
    }

    const score = input.riskScore;
    const thresholds = input.thresholds || {};
    if (
      !finiteNumber(score) || score < 0 || score > 1 ||
      !finiteNumber(thresholds.watch) || !finiteNumber(thresholds.high) ||
      thresholds.watch < 0 || thresholds.high > 1 ||
      thresholds.watch >= thresholds.high
    ) {
      return {
        status: STATUS.UNCERTAIN,
        reason: "A valid calibrated score and ordered, event-validated thresholds are required.",
        missingRequirements: ["validCalibratedScoreAndThresholds"],
        canOverrideWithModel: false
      };
    }

    if (score >= thresholds.high) {
      return {
        status: STATUS.HIGH,
        reason: "The event-validated model score meets the configured high threshold.",
        canOverrideWithModel: false
      };
    }
    if (score >= thresholds.watch) {
      return {
        status: STATUS.WATCH,
        reason: "The event-validated model score meets the configured watch threshold.",
        canOverrideWithModel: false
      };
    }
    return {
      status: STATUS.NO_ELEVATED_SIGNAL,
      reason: "No elevated signal was detected by the validated inputs; this is not a guarantee of safety.",
      disclaimer: "No elevated signal detected does not mean flooding is impossible.",
      canOverrideWithModel: false
    };
  }

  return { STATUS, classifyFloodStatus };
});
