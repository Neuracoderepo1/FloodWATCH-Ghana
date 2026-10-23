/**
 * FloodWatch Ghana — back-test scorecard.
 *
 * Scores classifier output against INDEPENDENTLY SOURCED impact labels.
 * It never invents or infers labels: a record with a true/false impact label
 * must cite its source, otherwise validation throws.
 *
 * Two modes, kept separate on purpose:
 *  - "hindcast":      may use observed rainfall from the event itself.
 *  - "early-warning": every input must have been issued at or before `cutoffAt`
 *                     (e.g. 2026-06-28T22:00:00Z). Later data is rejected to
 *                     prevent leakage of future observations.
 */
(function (root, factory) {
  const api = factory(typeof require === "function" ? require("./floodwatch-risk-quality.js") : root.FloodWatchRiskQuality);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FloodWatchScorecard = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (RQ) {
  "use strict";
  const S = RQ.STATUS;
  const ELEVATED = new Set([S.HIGH, S.WATCH]);          // model-rated Watch or higher
  const REASSURING = S.NO_ELEVATED_SIGNAL;              // the "Low" equivalent
  const MODES = ["hindcast", "early-warning"];

  const ms = (t) => (typeof t === "string" ? Date.parse(t) : NaN);
  const rate = (num, den) => (den === 0 ? null : num / den);
  const median = (a) => {
    if (!a.length) return null;
    const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  /**
   * record: {
   *   id, status (a classifier STATUS string),
   *   impacted: true | false | null   (null = no independent evidence either way)
   *   impactSource: string            (required when impacted is true/false)
   *   impactReportedAt?: ISO          (when the impact was reported to have occurred)
   *   firstElevatedAt?: ISO           (first time status reached Watch or higher)
   *   dataIssuedAt?: ISO              (latest issue time of any input used; required in early-warning)
   *   hasObservation: boolean         (a real gauge/station observation exists for this location)
   *   gridKey: string                 (actual weather grid cell used, "lat,lon")
   * }
   */
  function validate(records, opts) {
    if (!MODES.includes(opts.mode)) throw new Error("mode must be 'hindcast' or 'early-warning'");
    if (!Array.isArray(records)) throw new Error("records must be an array");
    const cutoff = ms(opts.cutoffAt);
    if (opts.mode === "early-warning" && !Number.isFinite(cutoff)) {
      throw new Error("early-warning mode requires a valid cutoffAt ISO timestamp");
    }
    const seen = new Set();
    for (const r of records) {
      if (!r || !r.id) throw new Error("every record needs an id");
      if (seen.has(r.id)) throw new Error("duplicate record id: " + r.id);
      seen.add(r.id);
      if (!Object.values(S).includes(r.status)) throw new Error(r.id + ": unknown status");
      if (r.impacted !== true && r.impacted !== false && r.impacted !== null) {
        throw new Error(r.id + ": impacted must be true, false or null");
      }
      if (r.impacted !== null && !(typeof r.impactSource === "string" && r.impactSource.trim())) {
        throw new Error(r.id + ": impact labels must cite an independent source");
      }
      if (typeof r.gridKey !== "string" || !r.gridKey) throw new Error(r.id + ": gridKey (actual grid cell) is required");
      if (typeof r.hasObservation !== "boolean") throw new Error(r.id + ": hasObservation must be boolean");
      if (opts.mode === "early-warning") {
        const issued = ms(r.dataIssuedAt);
        if (!Number.isFinite(issued)) throw new Error(r.id + ": early-warning records need dataIssuedAt");
        if (issued > cutoff) throw new Error(r.id + ": data issued after cutoff (future leakage)");
      }
    }
  }

  function computeScorecard(records, opts = {}) {
    validate(records, opts);
    const labelled = records.filter((r) => r.impacted !== null);
    const positives = labelled.filter((r) => r.impacted === true);
    const negatives = labelled.filter((r) => r.impacted === false);
    const highs = records.filter((r) => r.status === S.HIGH);

    const detected = positives.filter((r) => ELEVATED.has(r.status));
    const missed = positives.filter((r) => r.status === REASSURING);
    const unrated = positives.filter((r) => r.status === S.UNCERTAIN);
    const highLabelled = highs.filter((r) => r.impacted !== null);
    const falseAlarms = highLabelled.filter((r) => r.impacted === false);

    const leads = detected
      .map((r) => (ms(r.impactReportedAt) - ms(r.firstElevatedAt)) / 3600000)
      .filter((h) => Number.isFinite(h));

    const cells = new Set(records.map((r) => r.gridKey));
    return {
      mode: opts.mode,
      cutoffAt: opts.cutoffAt || null,
      counts: {
        locations: records.length,
        independentGridCells: cells.size,
        labelled: labelled.length,
        impacted: positives.length,
        notImpacted: negatives.length,
        unlabelled: records.length - labelled.length
      },
      // Impacted locations rated "No elevated signal".
      missedEventRate: rate(missed.length, positives.length),
      // Impacted locations rated Watch or High.
      detectionRate: rate(detected.length, positives.length),
      // Impacted locations the system declined to rate; neither detected nor "missed".
      unratedImpactedRate: rate(unrated.length, positives.length),
      // High ratings with a labelled outcome where no qualifying impact was recorded.
      falseAlarmRate: rate(falseAlarms.length, highLabelled.length),
      warningLeadTimeHours: {
        n: leads.length,
        median: median(leads),
        min: leads.length ? Math.min(...leads) : null
      },
      dataCoverage: {
        withObservations: records.filter((r) => r.hasObservation).length,
        modelOnly: records.filter((r) => !r.hasObservation).length,
        fractionObserved: rate(records.filter((r) => r.hasObservation).length, records.length)
      },
      warnings: [
        ...(positives.length === 0 ? ["no impacted locations: detection and missed rates are undefined"] : []),
        ...(negatives.length === 0 ? ["no labelled non-impact locations or wet no-flood days: false alarms cannot be measured"] : []),
        ...(cells.size < records.length ? [`${records.length - cells.size} location(s) share a grid cell with another; not independent`] : [])
      ]
    };
  }

  return { computeScorecard };
});
