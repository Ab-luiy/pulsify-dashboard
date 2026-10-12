# Managed growth readiness evidence — October 12, 2026

Canonical analysis and proposed PRD: `wiki/synthesis/mvp-readiness-and-pricing-2026-10-12.md`. Work tracked in https://github.com/Ab-luiy/pulsify-saas/issues/60.

## Results and limits

- `live-check.json`: 25 functional checks passed on the production Example workspace. Three YouTube prompts separately report `sourceNamesExposed: true`: a real privacy defect, regardless of the functional pass flags. These are pre-patch production results. No paid AI generation or actual output-quality assessment was performed.
- `backend-tests.txt`: baseline 233 passed. `backend-after-fix.txt`: 238 passed, including five new regression tests. `functions-build.txt`: compilation successful; standalone build warns about Sentry Node built-ins (production Wrangler config has nodejs_compat).
- `frontend-check.txt`: current frontend main 9afb032; lint, typecheck, build pass; browser run 755 passed, 509 skipped, one call-note edit payload failure. `delivery-rerun.txt`: complete affected file 15 passed. `delivery-repeat.txt`: specific test three further passes. Failure cause unresolved; do not describe the full suite as green. No frontend source change.
- `provisioning-evidence.json`: two historical provisioning records marked welcome sent. Evidence of dispatch recorded by the system, not payment or inbox receipt.
- `cleanup-verified.json`: zero remaining synthetic project, review and content rows. `live-state.json` is an earlier snapshot and contains pre-cleanup counts; it is superseded for cleanup status. `cleanup-each.txt` records the individual SQL operations, including notification deletion. `cleanup-result.json` reflects the earlier partial execution only.
- `pricing-model.json`: hypothetical labor, production and tools scenarios, not observed spending or vendor quotes.

## Reproduction

Run from the Brain root, with the existing gitignored demo credentials:

```powershell
node tools/mvp-readiness/pricing.mjs
node tools/mvp-readiness/live-check.mjs
```

The live check performs reversible demo writes, never customer writes. It refuses a non-demo login, avoids paid model generation, deletes synthetic chat/story records and logs out its own API session. The default run overwrites live-check.json, so preserve prior evidence before rerunning.

Setting `MVP_REVIEW_TEST=1` additionally creates a synthetic YouTube project, submits it and approves it using the existing operator key. It writes exact-ID cleanup.sql; it does NOT execute that SQL automatically. Run each cleanup statement individually through authenticated D1, then verify zero records/reviews/content/notifications for that exact synthetic title/ID. This audit already completed that cleanup. Do not reuse its SQL for a different run or widen its WHERE conditions.

Frontend commands run from `C:/Users/Abdullah/Desktop/pulsify-saas-wt/release-main`:

```powershell
npm run check -- -- --workers=2
npm run test:static -- tests/delivery.spec.ts --workers=1
npm run test:static -- tests/delivery.spec.ts -g "edits a call note" --workers=1 --repeat-each=3
```

The reference patch is saved in the Brain production-source helpers but not deployed. Claude's staged one-repo migration must re-copy those helpers and the new backend test at cutover. Existing persisted prompts need regeneration before sharing; editing the builder does not rewrite old records.
