---
name: project_crypto_income_demo_workspace
description: 2026-10-01 - clients pay Pulsify in crypto (Stripe and Wise unavailable in Turkey); Income tab issues receipts; AI writing stays off (prompts) until clients pay; Example workspace demo-example with status demo excluded from every real total; release rule is main-only
metadata:
  node_type: memory
  type: project
  originSessionId: e0f85de8-f3a4-4484-ae1e-b5a76817c2d8
  modified: 2026-10-01T18:20:57.715Z
---

Founder decisions 2026-10-01: AI writing stays OFF (copy-paste prompts, free) until payments come in, so no Anthropic key and no spend cap. Clients pay Pulsify in crypto, because Stripe and Wise are not available in Turkey. The YouTube guided video flow was released the same day.

Built: Income at `/app/income` (a tab beside Client payments). Recording a crypto payment issues its receipt in one step (payments rail `crypto`, reference = transaction id). Receipts are public unguessable pages at `/r/{token}`. Wallets are stored as public addresses only; the app tells people never to paste a key or seed phrase. He still needs to add his wallet address(es) under Income.

Example workspace: client `demo-example`, status `demo`, built by `output/standard-preview/tools/seed-demo-workspace.mjs` (rerun it to move the 30-day window to today). Every cross-client total, feed, list, the pooled lead model and the YouTube sync must leave status `demo` out, and any NEW cross-client query must too. It is labelled "Example workspace" in the portal header.

**Why:** a sales call needs the finished product with realistic numbers on screen, and a fake workspace in the same database would otherwise inflate his real Collected and Cash by client.

**How to apply:** exclude `status='demo'` in any new cross-client aggregate. Release rule (set by another session 2026-10-01): work from pulsify-saas `main` (land by pushing to main), then `npm run release` from the main checkout `C:\Users\Abdullah\Desktop\pulsify-saas`, never from a side branch. Migrations go on the live D1 with `wrangler d1 execute pulsify-portal --remote --file=...`, never `migrations apply`. Related: [[project_infoos_integration]], [[feedback_keys_and_apis_are_mine]].
