# Business onboarding field-test audit

## Goal

Make it possible for a local business owner with low digital confidence to move
from opening AkiPasa to starting a business listing without needing to
understand workspaces, subscriptions, URLs, or technical publishing terms.

## Audited journey

1. Open public discovery.
2. Find a way to add a business.
3. Create or access an account.
4. Send the business for review.
5. Understand when payment happens.
6. After approval, create the first venue.

## Friction found

- Public discovery had no direct owner call to action.
- The Business membership button led toward checkout even though checkout
  correctly requires staff approval first.
- Authentication used generic account copy and did not reassure owners that
  they would return to the business task.
- The application did not explain how long it takes, what information is
  needed, or that review is free and does not start a membership.
- The first venue form asked the owner to create a "slug", an internal web
  address concept.
- Several browser tests still depended on removed catalogue fixtures and an old
  navigation implementation, so they did not represent the current product.

## Changes made

- Added a prominent owner block to public discovery with one primary action:
  **Add my business**.
- Added **Add your business** to persistent navigation for people without
  business access.
- Kept the user's business intent through authentication and described the next
  step before account creation.
- Changed the Business membership action to **Start the free business review**.
- Added a literal three-step path: details, review, then plan and publishing.
- Added an approximate completion time, a short preparation list, plain labels,
  examples, specific error copy, and repeated no-payment reassurance.
- Added a help action and separated it from the primary completion action.
- Replaced the technical venue slug field with automatic safe URL generation.
- Updated browser coverage to work with real or empty catalogue data.

## Evidence used

- [GOV.UK assisted digital guidance](https://www.gov.uk/service-manual/assisted-digital/)
  says services must account for people who lack trust, confidence, access, or
  digital skills and should offer an appropriate assisted route.
- [GOV.UK form structure guidance](https://www.gov.uk/service-manual/design/form-structure)
  recommends asking only necessary questions and structuring forms around the
  common path.
- [W3C forms guidance](https://www.w3.org/WAI/tutorials/forms/) recommends short
  forms, visible labels, instructions, and clear feedback, especially for
  people with cognitive disabilities.
- [W3C cognitive accessibility guidance](https://www.w3.org/WAI/WCAG2/supplemental/patterns/o4p06-clear-labels/)
  recommends common words, visible labels, and step-by-step instructions.
- [Baymard account-creation research](https://baymard.com/blog/delayed-account-creation)
  shows that introducing account creation before users understand or commit to
  their primary task creates hesitation. AkiPasa cannot defer the account
  entirely, so the screen now preserves and explains the owner's original goal.

## Real-person field test

Recruit 5 to 8 Spanish local-business owners who do not work in technology.
Include at least two people who rarely use online forms. Test on their own
phones where possible.

Give one neutral prompt:

> You want your business to appear on AkiPasa. Show me what you would do.

Do not explain the interface. Record:

- whether they find **Add my business** without prompting;
- time to reach account creation;
- whether they understand that review is free and payment comes later;
- whether they complete each field without asking what it means;
- validation errors and recovery time;
- whether they can explain the next step in their own words;
- whether they notice the Business price and benefits without feeling pushed;
- where they ask for human help.

Success targets for the first round:

- 6 of 8 participants find the owner CTA in under 30 seconds;
- 6 of 8 reach the application without navigation help;
- every participant correctly states that no payment happens during review;
- no participant encounters a technical term they cannot explain;
- submitted applications contain enough information for staff review.

## Remaining operational gap

Email is currently the only configured public support channel. For owners who
struggle with email, add a staffed phone or WhatsApp number to configuration
and show it beside the application form. Do not publish an unmonitored number.

## Conversion guardrails

Use specific benefits, clear next actions, transparent pricing, and honest
reassurance. Do not use fake scarcity, hidden charges, preselected paid plans,
fabricated testimonials, or misleading urgency.
