# Phase 1 — Creator Community MVP

## Goal
Build the complete responsive Creator Community experience and its administration foundation. Marketplace remains a clearly labeled placeholder only.

## Visual direction
- Follow the approved editorial SaaS palette, Inter typography, and 8px spacing system.
- Translate the reference video only into generous whitespace, strong heading hierarchy, measured section rhythm, balanced card proportions, selective horizontal browsing, clear image/content presentation, and restrained feedback.
- Use short fades, small lifts, and smooth state changes with reduced-motion support.
- Do not reproduce Apple branding, colors, navigation, copy, layouts, cards, shopping patterns, imagery, product names, or signature animations.

## Application foundation
- Create one reusable responsive shell with role-configured sidebar, top bar, and mobile navigation.
- Add shared buttons, form controls, search/filter controls, cards, badges, dialogs, tables, notifications, and loading/empty/error/success states.
- Add email/password authentication with Creator and Business signup, separate admin login, protected routes, and role-aware redirects.
- Provide a minimal Business landing screen and Marketplace “coming soon” state without implementing marketplace workflows.

## Creator experience
- Dashboard with Community as the primary destination.
- Active Community feed ordered newest first, with case-insensitive keyword search, category filter, clear filters, and polished empty/error/loading states.
- Initiative detail with four distinct sections: documented information, evidence/source, claims, and voluntary suggested action; missing values use the approved fallback language.
- Support confirmation dialog, unique participation creation, participation state, validated HTTP/HTTPS content URL submission, and Completed state.
- Private participation history, notifications list, and profile foundation.
- Closed initiatives disappear from the feed, remain reachable through history, and lock pending content submission.

## Community administration
- Initiative Manager: dashboard, initiative list, create/edit draft, evidence and claim editors, submit for review, active management, and close dialog.
- Reviewer: dashboard, review queue, creator-style initiative preview, complete 10-item checklist, required-comment changes dialog, approve-and-publish dialog, active management, and closed list.
- Reuse the detail presentation and administration list views across roles.
- Enforce every status transition and prevent creators from reviewing their own initiatives both in visible controls and server-side actions.

## Data and security
- Store profiles and roles separately, with no public admin signup.
- Add initiatives, evidence, claims, participations, review checklists, checklist responses, and notifications.
- Apply row-level access rules for each role, creator-private participation data, and manager/reviewer permissions.
- Use protected server functions for sensitive transitions; database constraints prevent duplicate support and invalid lifecycle changes.
- Seed only clearly labeled demo initiatives and seeded admin roles; no fabricated real-world sources or evidence.

## Routes
- Public: `/`, `/auth`, `/signup/creator`, `/signup/business`, `/admin/login`.
- Creator: `/dashboard`, `/community`, `/community/$initiativeId`, `/history`, `/notifications`, `/profile`, `/marketplace`.
- Business: `/business` and `/marketplace` placeholder access.
- Administration: `/admin`, `/admin/initiatives`, `/admin/initiatives/new`, `/admin/initiatives/$initiativeId/edit`, `/admin/review`, `/admin/review/$initiativeId`, `/admin/active`, `/admin/closed`.
- Every content route receives unique page and sharing metadata.

## Validation
- Verify sign up, sign in, sign out, protected navigation, and each role’s allowed destinations.
- Verify search/filter/order, initiative support, URL validation, history, closed-state behavior, manager lifecycle, reviewer checklist, and self-review denial.
- Verify visible loading, empty, error, success, disabled, and locked states.
- Check keyboard/focus behavior and layouts at 360px, 768px, and 1280px using the running app.
- Run focused tests, confirm a clean build, and run the database security linter.

## Explicit exclusions
No payments, chat, contracts, negotiations, social APIs, scraping, automatic posting or verification, fundraising, rankings, recommendations, political scoring, AI truth detection, predictive scoring, social networking, or full Marketplace implementation.
