/**
 * FloodWatch Ghana — adapter between dashboard data and the classifier.
 *
 * Only reports what the dashboard can truthfully assert. Every validation gate
 * the dashboard cannot actually demonstrate is left false, so the classifier
 * returns "Risk uncertain — data insufficient" until real validation exists.
 *
 * To enable High / Watch / No elevated signal, each gate must be set by a
 * reviewed, documented validation step (not by flipping a flag here).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FloodWatchInputs = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  /**
   * Validation state, maintained by humans. All false today:
   * - Only one event (28–29 June 2026) is available and thresholds were not fitted to it.
   * - Exposure / hydrology inputs are a ~90 m DEM and incomplete OSM waterways.
   * - Open-Meteo is a coarse model grid, so 13 point samples are not adequate coverage.
   */
  const VALIDATION = Object.freeze({
    spatialCoverageAdequate: false,
    modelValidatedAgainstMultipleEvents: false,
    exposureDataValidated: false,
    hydrologyDataValidated: false,
    thresholdsEventValidated: false
  });

  /**
   * @param {object} ctx
   * @param {boolean} ctx.live        rainfall feed fetched successfully (not sample data)
   * @param {boolean} ctx.hasSourceTimestamp  the feed returned a usable model timestamp
   * @param {object} [ctx.official]   {active, sourceVerified, sourceName} from NADMO/GMet, if integrated
   * @param {boolean} [ctx.confirmedIncident]
   * @param {boolean} [ctx.unverifiedReport]
   * @param {number|null} [ctx.riskScore]  calibrated 0..1 score; null/undefined until one exists
   * @param {object} [ctx.thresholds]
   */
  function buildClassifierInput(ctx = {}) {
    return {
      officialAlert: ctx.official || { active: false, sourceVerified: false },
      confirmedIncident: ctx.confirmedIncident === true,
      unverifiedReport: ctx.unverifiedReport === true,
      riskScore: typeof ctx.riskScore === "number" ? ctx.riskScore : undefined,
      thresholds: ctx.thresholds,
      quality: {
        ...VALIDATION,
        dataFresh: ctx.live === true,
        sourceTimestampAvailable: ctx.hasSourceTimestamp === true
      }
    };
  }

  return { VALIDATION, buildClassifierInput };
});
