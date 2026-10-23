# First-hand observation form (draft)

Purpose: collect **first-hand** reports of whether a place was flooded or dry on
**29 June 2026**, so the back-test has labels that come from people who were there,
not from news summaries or from rainfall data. Paste the questions below into a
Google Form (or send them as a message). Do not collect anything the project does
not need.

## Intro text to show at the top
> We are testing a flood-awareness page for Greater Accra against what actually
> happened on 29 June 2026. We only need what **you saw yourself**. Please do not
> report what someone else told you. Do not give your house number or street
> address; the neighbourhood and a nearby landmark are enough. Photos and videos
> are optional and will **not** be published.

## Questions
1. **Neighbourhood** (required): e.g. Tse-Addo, Kaneshie, Weija.
2. **Nearest landmark or main road** (required): e.g. "near Kpeshi Lagoon bridge". No house numbers.
3. **Did you see this yourself?** (required, single choice)
   - Yes, I was there and saw it
   - No, someone told me, or I saw it on social media *(these answers are not used as labels)*
4. **What did you see on 29 June 2026?** (required, single choice)
   - Water on the road or in compounds / houses (flooded)
   - Rain, but the road and compounds stayed dry (not flooded)
   - Not sure
5. **If flooded, how deep at the deepest point you saw?** (single choice)
   - Ankle · Knee · Waist · Reached vehicle windows · Higher · Not sure
6. **Time you were there** (required): from ___ to ___ (24-hour clock, 29 June). If flooded, also: "water first seen at about ___", "highest at about ___", "gone by about ___" (any you know).
7. **If you saw it dry: were you there for the main rain?** (required when answer to 4 is dry)
   - I was there continuously from before 06:00 until after 14:00
   - I was there for part of that time only *(recorded, but not used as a dry label)*
8. **When did the rain start where you were?** (optional): evening of 28 June / early morning / later / not sure.
9. **Photo or video** (optional): upload and tick "OK to use privately for checking; do not publish".
10. **Contact** (optional): phone or email, only so we can ask a follow-up question.
11. **Consent** (required, tick): "I agree my answers may be used, without my name, in the project's flood back-test and evidence log."

## How the project turns answers into labels (rules for whoever reads the responses)
- Only answer 3 = "I was there" is used.
- **Flooded** needs a place, a time window on 29 June and "flooded". Record as `impacted: true`, source "first-hand observation, form response, [date received]".
- **Dry** needs the continuous window in question 7 (before 06:00 to after 14:00). A dry street at midday is not a dry day, because flooding at 09:00 may have drained by noon. Record as `impacted: false`. Anything weaker stays `null`.
- Never infer a label from rainfall, from a neighbouring area, or from silence.
- If two people disagree about the same neighbourhood, keep both, at street/landmark level, and do not average them. Large neighbourhoods contain wet and dry streets, so labels are per landmark/point, not per whole neighbourhood, until the project defines areas.
- Store only: neighbourhood, landmark, time window, observation, depth class, evidence grade, date received. Do **not** commit names, contact details, house addresses, photos or videos to the repository (it is public). Keep raw responses in a private place.
- Check media metadata (date taken) where media is supplied; media never replaces the written answers.
