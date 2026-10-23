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
   *   impactEvidence?: "confirmed" | "no_inventory_record"   (default "confirmed")
   *   date?: "YYYY-MM-DD"             (required for no_inventory_record)
   *   inventorySources?: [{name,url,searchedAt,coverageStart,coverageEnd}]
   *                                   (required for no_inventory_record)
   * }
   *
   * "no_inventory_record" is a WEAKER label: heavy rain was measured, a documented
   * search of flood inventories found no flood for that date, so impacted is
   * recorded as false. It is not proof that nothing flooded. It never counts as a
   * confirmed non-impact; it only feeds the false-alarm UPPER BOUND.
   */
  const EVIDENCE = ["confirmed", "no_inventory_record"];
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
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
      const ev = r.impactEvidence === undefined ? "confirmed" : r.impactEvidence;
      if (!EVIDENCE.includes(ev)) throw new Error(r.id + ": unknown impactEvidence");
      if (ev === "no_inventory_record") {
        if (r.impacted !== false) throw new Error(r.id + ": no_inventory_record requires impacted === false");
        if (typeof r.date !== "string" || !DAY.test(r.date)) throw new Error(r.id + ": no_inventory_record requires date YYYY-MM-DD");
        if (!Array.isArray(r.inventorySources) || r.inventorySources.length === 0) {
          throw new Error(r.id + ": no_inventory_record requires inventorySources documenting the search");
        }
        const d = Date.parse(r.date + "T00:00:00Z");
        for (const src of r.inventorySources) {
          const ok = src && ["name", "url", "searchedAt", "coverageStart", "coverageEnd"].every((k) => typeof src[k] === "string" && src[k].trim());
          if (!ok) throw new Error(r.id + ": each inventory source needs name, url, searchedAt, coverageStart, coverageEnd");
          const a = Date.parse(src.coverageStart), b = Date.parse(src.coverageEnd);
          if (!(Number.isFinite(a) && Number.isFinite(b) && a <= d && d <= b + 86399999)) {
            throw new Error(r.id + ": date is outside the coverage window of inventory source " + src.name);
          }
        }
      } else if (r.impacted !== null && !(typeof r.impactSource === "string" && r.impactSource.trim())) {
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
    const weak = (r) => r.impactEvidence === "no_inventory_record";
    const labelled = records.filter((r) => r.impacted !== null && !weak(r));   // confirmed labels only
    const noInventory = records.filter(weak);
    const positives = labelled.filter((r) => r.impacted === true);
    const negatives = labelled.filter((r) => r.impacted === false);             // confirmed negatives only
    const highs = records.filter((r) => r.status === S.HIGH);

    const detected = positives.filter((r) => ELEVATED.has(r.status));
    const missed = positives.filter((r) => r.status === REASSURING);
    const unrated = positives.filter((r) => r.status === S.UNCERTAIN);
    const highLabelled = highs.filter((r) => r.impacted !== null && !weak(r));
    const falseAlarms = highLabelled.filter((r) => r.impacted === false);
    const highWeak = highs.filter(weak);

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
        noInventoryRecord: noInventory.length,
        unlabelled: records.length - labelled.length - noInventory.length
      },
      // Impacted locations rated "No elevated signal".
      missedEventRate: rate(missed.length, positives.length),
      // Impacted locations rated Watch or High.
      detectionRate: rate(detected.length, positives.length),
      // Impacted locations the system declined to rate; neither detected nor "missed".
      unratedImpactedRate: rate(unrated.length, positives.length),
      // High ratings with a labelled outcome where no qualifying impact was recorded.
      falseAlarmRate: rate(falseAlarms.length, highLabelled.length),
      // Weaker upper bound: also treats "no flood on record in the inventories searched" as not flooded.
      // It is NOT a confirmed rate. Null when there are no High ratings with any non-null label.
      falseAlarmRateUpperBoundIncludingNoInventory: rate(falseAlarms.length + highWeak.length, highLabelled.length + highWeak.length),
      falseAlarmNotes: "falseAlarmRate counts only confirmed outcomes. The upper bound also counts High ratings on days with no flood on record in the cited inventories, which is weaker evidence than a confirmed dry label.",
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
        ...(negatives.length === 0 ? ["no confirmed non-impact locations or wet no-flood days: confirmed false alarms cannot be measured"] : []),
        ...(noInventory.length > 0 ? [`${noInventory.length} record(s) rely on "no inventory record" evidence: false alarms are reported only as an upper bound for those`] : []),
        ...(cells.size < records.length ? [`${records.length - cells.size} location(s) share a grid cell with another; not independent`] : [])
      ]
    };
  }

  return { computeScorecard };
});
