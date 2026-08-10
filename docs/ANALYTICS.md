# Analytics taxonomy

Privacy-minimized event names: `discovery_search_performed`, `event_detail_viewed`, `venue_detail_viewed`, `directions_clicked`, `external_booking_clicked`, `share_initiated`, `event_saved`, `venue_followed`, `check_in_accepted`, `check_in_rejected`, `passport_step_completed`, and `promotion_requested`.

Properties may include entity IDs, coarse locality, filter values, result count, and rejection reason. Never capture precise consumer location or expose consumer identity in business analytics.

The live MVP currently records event/venue views, directions, external booking or venue-website clicks, shares, saves and follows. The same-origin endpoint uses a strict schema: unknown properties are rejected, and the database function independently rejects personal metadata keys. Local-test identifiers are deliberately not recorded.
