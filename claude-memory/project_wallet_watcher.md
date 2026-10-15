---
name: project_wallet_watcher
description: 2026-10-15 receipts are emailed on issue and a wallet watcher turns Ethereum USDT/USDC arrivals into receipts; other chains parked until a client needs them
metadata:
  type: project
---

Released 2026-10-15 (pulsify-saas #24). Every receipt is emailed to the client at once from the existing EMAIL_FROM sender (hello@pulsify-ai.com), with a thank-you note and a "Good to know" list that ends with a next step to /login/client. The sync worker calls the Pages job `crypto-watch` every other minute; it reads USDT and USDC transfers into the founder's Ethereum wallet through a public RPC (no key). A sender already tied to a client gets a receipt and email automatically; any other sender waits on Income ("Payments from your wallet", with status marks) and the founder is emailed. Every cent counts, only sub-cent amounts are skipped. A sender tied to two clients is never auto-matched again.

**Why:** the founder wants clients to get tax-ready receipts with no manual step. He pays and is paid in crypto from Turkey.

**How to apply:** other chains (Tron, Solana, Bitcoin) are not watched; the founder said to add them when a client needs one and to log it before they pay. A ticket will track it. Wallet saved: USDT on Ethereum. Related: [[project-crypto-income-demo-workspace]].
