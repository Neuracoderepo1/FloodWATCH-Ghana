# Evidence log — Greater Accra flood, 28–29 June 2026

Status of every item: **verified** (read from the cited page or file this session),
**user-reported** (stated by the project owner, not independently checked), or
**unverified** (claimed by a secondary source that could not be read). Nothing here
is a fixture yet: `fixtures/accra-flood-2026-06.json` does not exist until grid cells
and sourced labels are in place. Home addresses are deliberately not recorded.

## Rainfall
| Item | Status | Source |
|---|---|---|
| 169.2 mm daily rainfall, GMet, "fourth-highest since 1995", for **Monday 29 June**; no station or hours given | verified | Graphic Online, 2026-06-30 18:02 (Interior Minister's address) |
| June 2026 monthly total 593.2 mm (previous record 420.6 mm, 2002) | verified | same |
| "~140 mm" preliminary figure attributed to the President | reported by several outlets; origin and window not established | Modern Ghana, Asaase Radio, News Alert Ghana (not re-read) |
| Open-Meteo reanalysis central Accra: 3.5 mm (28 Jun), 7.5 mm (29 Jun) | retrieved earlier; grid cell not recorded | — |
| Why Open-Meteo/ERA5 differs from 169.2 mm | **unresolved** (smoothing hypothesis is unsourced) | — |

## Impacts (national / assembly level)
| Item | Status | Source |
|---|---|---|
| Greater Accra: 12 deaths confirmed, 7 missing (as of Tue 30 Jun morning) | verified | Graphic Online |
| 38,802 people / 7,761 households affected (article also calls them displaced) | verified | Graphic Online |
| 18 assemblies affected; named: Ga East, Ledzokuku, Ayawaso Central, Korle Klottey, Tema West, Tema Metropolitan | verified | Graphic Online |
| 13 deaths, 58,000 displaced, 18 assemblies (Copernicus GloFAS) | **unverified**: page returned no readable content | global-flood.emergency.copernicus.eu |

## Location-level labels
| Location | impacted | Status | Evidence |
|---|---|---|---|
| Tse-Addo (La/Teshie area) | true | **user-reported, first-hand** | Video recorded by the project owner, embedded metadata `2026-06-29T09:54:40Z`, iPhone XR, 13 s; shows street and yards flooded, cars partly submerged, rain falling. Three accompanying photos have no EXIF. Location rests on the owner's statement (no GPS). Owner recollection: rain from evening 28 Jun; flooding began ~08:00–09:00 on 29 Jun and kept rising until evening; a bungalow fence nearly submerged. Media files are **not** committed (number plates, private compounds). |
| Mallam | true | verified (secondary) | GNA 2026-06-30: "Mallam and surrounding areas were among the worst affected" |
| Adabraka, Teshie, Bush Road | affected | **user-reported, source not stated**; needs an independent citation before use | project owner |
| Airport Residential | null | user-reported: not flooded but felt the rain's impact; ambiguous | project owner |
| Nima, Kaneshie, Dansoman | null | GNA mentions damage "earlier this season", undated; **not** a 29 June label | GNA |
| Kaneshie, Circle (flooded), Cantonments (dry) | null | rejected: real-estate blog dated 2026-10-03, not independent | ghanarealtyconnect.com |

## Model rainfall at Tse-Addo (Open-Meteo archive, point query, GMT)
Hourly series is saved in `fixtures/draft/tse-addo.json`. Daily totals: 28 Jun 3.0 mm, 29 Jun 6.0 mm; peak 1.3 mm/h at 10:00 UTC on 29 Jun; 08:00-11:00 UTC total 3.3 mm; 18:00 on 28 Jun to 07:00 on 29 Jun total 0.4 mm.
At 09:54 UTC on 29 Jun the owner's video shows the street flooded and rain falling, while the model shows about 1 mm/h. Against GMet's 169.2 mm for the day, this model output would have given the old dashboard rainfall rule no signal at all. Single point, single event: this supports keeping the validation gates false; it is not a calibration.
The lat/lon returned by both the forecast and archive endpoints was identical, so it is an echo of the query point and does not identify the grid cell.

## Pre-event forecast information
| Item | Status | Source |
|---|---|---|
| News summary of GMet forecast, published 2026-06-28 19:03 UTC; Greater Accra listed as currently affected; "slight to moderate rain along the coast" early 29 Jun; no amounts; **GMet issue time not given** | verified | YEN.com.gh |
| Modern Ghana "GMet warns more rain", dated 2026-06-29 | **unusable** for early-warning mode (after cutoff) | Modern Ghana |

## Timing note for the early-warning test
Owner recollection puts the start of rain in the evening of 28 June, before the proposed
22:00 cutoff. If gauge data confirms that, the cutoff and lead-time definition need review.

## Still needed
Station/gauge series for 28–29 June; the actual GMet/NADMO warning texts with issue times;
archived model runs issued before the cutoff; grid cells actually used for each location
(including Tse-Addo, coordinates needed at neighbourhood level); sourced labels for
additional localities; heavy-rain days **without** flooding.
