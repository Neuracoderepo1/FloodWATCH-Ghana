# June 28 regression fixture

Place the event data at `fixtures/june28.json`. Until it exists, the
fixture-dependent regression tests are reported as **skipped**, not passed.

Expected shape:

```json
{
  "event": "2026-06-28 Greater Accra flooding",
  "source": "where the observations came from (NADMO report, news, gauge, etc.)",
  "neighborhoods": [
    {
      "name": "Kaneshie",
      "floodedObserved": true,
      "observedSource": "citation or URL",
      "hourlyPrecipMm": [0, 0, 1.2, "... 96 values: 48 past + 48 forecast hours as the dashboard sees them"]
    }
  ]
}
```

Only include `floodedObserved: true/false` where there is a real, cited
observation. Do not infer it from the model rainfall.
