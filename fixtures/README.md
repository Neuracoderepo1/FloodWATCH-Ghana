# Accra flood back-test fixture (28–29 June 2026)

Put the event data at `fixtures/accra-flood-2026-06.json` and run
`node run-backtest.js`. With no fixture it exits with code 2 and scores nothing;
the fixture-dependent tests in `regression.accra-flood-2026-06.test.js` are
reported as **skipped**, never passed.

**Rules:** never invent or infer labels. `impacted` is `true`/`false` only with a
cited independent `impactSource`; otherwise `null`. Preserve the source and
report time of every impact figure (early counts change). Include wet days
*without* serious flooding, or false alarms cannot be measured. Record the actual
weather grid cell (`gridKey`) so shared cells are not counted as independent.

Run two separate fixtures/modes: `hindcast` (observed event data allowed) and
`early-warning` (every input issued at or before `cutoffAt`, e.g.
`2026-06-28T22:00:00Z`; later data is rejected as leakage).

```json
{
  "event": "2026-06-28/29 Greater Accra flooding",
  "mode": "early-warning",
  "cutoffAt": "2026-06-28T22:00:00Z",
  "rainfallReconciliation": "note on how reported ~140 mm vs Open-Meteo values were reconciled",
  "locations": [
    {
      "id": "kaneshie-2026-06-28",
      "gridKey": "5.55,-0.25",
      "hasObservation": true,
      "dataFresh": true,
      "dataIssuedAt": "2026-06-28T21:00:00Z",
      "impacted": true,
      "impactSource": "citation or URL, with report time",
      "impactReportedAt": "2026-06-29T03:30:00Z",
      "firstElevatedAt": null,
      "hourlyPrecipMm": [0, 0, 1.2]
    }
  ]
}
```

## Weaker label: `impactEvidence: "no_inventory_record"`

A sourced "no flooding on day X" statement is rare. For heavy-rain days (gauge
reading of 40 mm or more) with no flood in the inventories you searched, you may
record `impacted: false` with:

```json
{
  "impacted": false,
  "impactEvidence": "no_inventory_record",
  "date": "2023-05-14",
  "inventorySources": [
    {"name": "NADMO situation reports", "url": "https://...", "searchedAt": "2026-10-23",
     "coverageStart": "2018-01-01", "coverageEnd": "2026-06-27"}
  ]
}
```

This is **not** proof that nothing flooded. The scorecard keeps it out of every
confirmed count and reports false alarms two ways: `falseAlarmRate` (confirmed
outcomes only) and `falseAlarmRateUpperBoundIncludingNoInventory` (also counts
these days). Records are rejected unless `date` is inside each inventory's
coverage window and every inventory source is fully described. The gauge reading
that makes the day "heavy rain" must still come from a station or an official
statement, not from reanalysis.
