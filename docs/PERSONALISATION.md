# Personalisation

Personalisation is opt-in. A pseudonymous, HttpOnly annual identifier and rotating 30-minute session identifier are issued to support safe anonymous sessions; behavioural storage begins only after the `ak_personalisation=granted` choice. Signed-in use additionally requires `personalisation_settings.personalisation_enabled`.

`preference_profiles` can represent an account or anonymous visitor. On sign-in, an anonymous profile can be attached to the account without duplicating events. Features store a score and confidence separately, short- and long-term views, positive/negative evidence, and the last signal time.

Available v1 dimensions are category, subcategory, venue, artist, organiser, price, distance, time, weekday, planning horizon and search intent. Current catalogue data populates category, venue and price; the remaining dimensions are stable extension points.

Negative signals are deliberately asymmetric:

- a single impression is neutral;
- a skip is weak and diminished when repeated rapidly;
- a quick exit is moderate;
- Not interested is strong;
- hide venue is very strong.

The account privacy screen can disable learning without erasing history, or clear the profile, raw linked history, recommendation logs and experiment assignments. Account deletion cascades linked profile data. Export includes direct behaviour, settings and preference-profile rows; feature rows use the exported preference-profile ID.

Cold start uses verified quality, proximity, event timing, freshness and diversity. Current filter/category intent overrides older affinity within the request. Exploration is always bounded and measured separately from exploitation.
