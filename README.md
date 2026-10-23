# FloodWATCH-Ghana

Greater Accra rainfall and terrain dashboard (`index.html`, static).

## Status: not a validated flood forecast
Flood-risk ratings are **withheld**. Every area shows
**"Risk uncertain — data insufficient"** until the model is validated against
multiple independent flood events. Do not present this dashboard as a safety
assessment. For official alerts follow NADMO and GMet.

## Files
- `index.html` — dashboard (rainfall from Open-Meteo, elevation, OSM waterways, context only)
- `floodwatch-risk-quality.js` — conservative status classifier (official alerts and confirmed incidents take precedence; fails safe to UNCERTAIN)
- `floodwatch-inputs.js` — adapter; every validation gate is `false` until real validation is documented
- `*.test.js` — run with `node --test`
- `fixtures/` — place `june28.json` here to enable the June 28 regression tests (see `fixtures/README.md`)
- `docs/` — original patch notes and test output

## Open items before any public rating
1. Supply June 28 observed-flooding data and run the fixture regression tests (currently skipped).
2. Validate on multiple independent events; derive thresholds from that validation (the 0.35 / 0.65 values in tests are fixtures only).
3. Validate exposure and hydrology inputs (90 m DEM and incomplete OSM waterways are not enough).
4. Integrate verified NADMO/GMet alerts as the `officialAlert` input.
5. Deploy: the live Netlify site was a manual static upload; redeploy from this repo only after the above.
