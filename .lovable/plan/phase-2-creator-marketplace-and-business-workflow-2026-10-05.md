# Phase 2 — Creator Marketplace and Business Workflow

## Goal
Extend the existing CommonGround app with the requested marketplace workflow while leaving Phase 1 Community, authentication, roles, and administration unchanged. Continue using the current “CommonGround.” wordmark.

## What will be built

### Shared marketplace foundation
- Add secure records for creator marketplace profiles, profile evidence, business campaigns, shortlists, and connection requests.
- Enforce role ownership and visibility in the backend.
- Enforce a maximum of three shortlisted creators per business and the connection state sequence: Pending → Accepted/Declined → Confirmed.
- Keep budget informational only; discovery filters will never use it.

### Creator experience
- Replace the Marketplace placeholder with a connection request list and request detail screens.
- Allow creators to accept or decline pending requests and see all current statuses.
- Extend the existing Profile page with editable marketplace profile fields, evidence, and Draft/Submitted states.
- Keep creator navigation focused on Dashboard, Community, Marketplace, Profile, and Notifications.

### Business experience
- Replace the business placeholder with a dashboard linking to Campaigns, Discover Creators, shortlisted creators, and connection requests.
- Add campaign list and create campaign screens with the specified fields.
- Add creator discovery with deterministic AND filters for location, niche, language, content type, and follower range.
- Add creator profile detail, shortlist controls, a maximum-three compare view, and connection sending.
- Add a connections screen where businesses can see statuses and confirm accepted connections.

### Presentation and verification
- Apply the requested burgundy primary and rose accent through semantic design tokens while preserving neutral, success, warning, and error colors.
- Preserve the landing page structure and equal Creator/Business entry buttons already present.
- Preserve signup fields and authentication; retain the current Back behavior.
- Verify the new workflows and layouts at 360px, 768px, and 1280px.

## Technical details
- New content routes remain under the existing authenticated shell.
- Each new route gets distinct page metadata.
- Shared marketplace data access lives in a dedicated client-safe module.
- The migration includes grants, row-level policies, constraints, indexes, and transactional functions for shortlist limits and status transitions.
- Existing Community tables, functions, routes, and permission logic are not modified.

## Out of scope
No chat, messaging, negotiation, contracts, payments, analytics, revenue dashboards, AI matching, scoring, ranking, recommendations, or creator approval.
