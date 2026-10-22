# AkiSuite membership studio source contract

The discovery membership screens in AkiPasa, AkiDuermo and AkiCoches
use the same `AkiSuiteMembershipStudio` presentation component and stylesheet.
Their Git blobs must be identical. Each app supplies only its own theme,
localized copy, five offers and navigation or checkout actions.

Source-of-truth paths:

- `src/components/AkiSuiteMembershipStudio.tsx`
- `src/components/AkiSuiteMembershipStudio.module.css`

Review all three application adapters whenever the shared template changes.
Copy the resulting identical component and stylesheet into all three repos,
then update and run their source-parity tests in the same release.

The first two cards are AkiHQ Free and Listing Premium under one AkiHQ mark.
The remaining three are AkiBusiness Standard, Plus and Pro under one
AkiBusiness mark. The one-pixel grey separator divides the group headers.
No logos appear inside individual plan cards. The two group headers and
all five cards share a keyboard-accessible horizontal scroller on mobile.

This layout does not grant entitlements, change Stripe state, alter
subscription prices or create checkout. Business billing and permissions
remain scoped to the appropriate application and operating location.

The approved AkiHQ and AkiBusiness group marks are loaded from existing
`/brand/hq-mark.svg` and `/brand/business-mark.svg` files in each app.
