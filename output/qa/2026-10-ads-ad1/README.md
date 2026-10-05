# Ads AD1 verification

Ticket: Ab-luiy/pulsify-saas #45. Released 2026-10-05 from clean pushed main 8f1f219 to Pages c893b3f0. Feature commit: 756d933; final commit adds the existing lead-toast test repair.

The shared Coming soon page is available at /app/ads and /app/portal/ads. The nine stage values are static illustrative samples, labelled SAMPLE and explicitly described as neither account data nor projected results. The preview has no ad controls, forms, account-data requests or persistence. The operator has a small Planned link to #46; clients do not.

Ads follows Funnel in the client menu. The existing operator Funnel remains grouped under Clients; the standalone Ads entry follows that funnel entry in the navigation source, appearing after Clients in the open operator menu. Both use the shared Megaphone icon.

Focused production-export verification: 10/10 passed. Each audience rendered in light and dark at 1536 and 390 widths, with no page overflow and zero axe WCAG 2.1 A/AA violations. Navigation from both island menus passed. All eight PNGs in this folder were visually inspected. They contain illustrative sample values, not client results.

Final full check: npm run check -- -- --workers=2 passed lint, TypeScript, production build and 767 browser tests, with 486 intentional skips. The first run exposed an existing duplicate lead-save toast assertion and one Chromium resource-buffer flake. The test now waits for the earlier toast to expire before checking the next save, preserving payload checks; affected tests and the final full suite passed. No Instagram product behavior changed.

Live anonymous verification: /app/ads redirects to operator sign-in; /app/portal/ads redirects to client sign-in. Operator route payload redirects to sign-in; client route payload returns 404. Authenticated live browser inspection was unavailable because Chrome was not connected. The role views were verified against the actual static production export before release.

AD2 manual tracking and AD3 Meta integration are outside this release. No backend or database changes.
