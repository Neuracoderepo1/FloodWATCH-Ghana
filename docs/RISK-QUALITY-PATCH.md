# FloodWatch Ghana — Risk Quality Patch

## What this patch does
- Fails safely to **“Risk uncertain — data insufficient”** when data freshness, spatial coverage, validated exposure/hydrology inputs, multi-event model validation, source timestamps, or event-validated thresholds are missing.
- Gives verified official alerts precedence over model scores.
- Prevents confirmed incidents and unverified reports from being silently downgraded by a low model score.
- Uses “No elevated signal detected” rather than “Low risk” or “Safe” when a fully validated model is below threshold.
- Requires threshold values to be supplied from event validation; it does not tune thresholds from the single June 28 event.

## What it does not do
- It does not create or validate a flood forecast.
- It does not fix Open-Meteo's historical timing or coarse-grid limitations.
- It is not yet integrated into `floodwatcher.netlify.app`.
- The current Netlify production deploy is a manual static deploy with no source ZIP, and the connected GitHub repository previously contained only a README. Do not claim the live dashboard is fixed until the module is integrated, tested in the app, and redeployed.

## Integrating into the dashboard
1. Add `floodwatch-risk-quality.js` to the dashboard source.
2. Replace any existing flood-status calculation with `FloodWatchRiskQuality.classifyFloodStatus(input)`.
3. Supply only trusted, timestamped inputs. Do not label Open-Meteo model output as observed rainfall or independent confirmation.
4. Keep demonstration polygons and sample reports marked as demo/unverified.
5. Run `node --test floodwatch-risk-quality.test.js`.
6. Validate on multiple independent flood events before enabling High/Watch/No elevated signal classifications in public use.

Thresholds in the tests (`0.35`, `0.65`) are test fixtures only, **not production recommendations**.
