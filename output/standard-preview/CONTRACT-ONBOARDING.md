# Contract onboarding

Implemented 2026-09-09. Activation requires the founder's DocuSign account configuration. No real invitation emails were sent during development.

## Configuration

Set Cloudflare Pages secrets DOCUSIGN_ACCOUNT_ID, DOCUSIGN_HMAC_SECRET, INTEGRATION_ENCRYPTION_KEY (base64-encoded 32 random bytes), RESEND_API_KEY and EMAIL_FROM. Do not place values in source or chat. DOCUSIGN_CLIENT_ROLE optionally replaces the default Client role.

In DocuSign Connect, configure the HTTPS listener `/api/docusign-connect`, JSON SIM, envelope-completed, HMAC signatures, and include recipients and custom_fields. Only marked onboarding contracts are processed: add the envelope text custom field `pulsify_portal` with value `true`. Exactly one completed signer must have the Client role. Test with a controlled signer before client rollout.

Admin → Integrations → Signed contract to workspace shows missing configuration and the latest 30 provisioning results. A configuration-present result is not evidence of a successful live contract test.

## Behavior and recovery

The handler verifies the raw-body HMAC and account before reading identity. New accounts receive a deterministic email-derived workspace id; a D1 transaction creates the workspace, password setup token and encrypted pending invitation together. Existing account credentials are never reset. Repeat envelopes reuse the original invitation and email idempotency key. Successful delivery removes the stored encrypted link. Delivery failure returns 503 so DocuSign retries. After 48 hours the invitation expires and the admin needs to generate a replacement through the existing client invitation action. Do not rotate the encryption key while pending invitations remain without a migration.

The register/password flow then opens the existing intake. Adaptive feature configuration from intake is a separate unfinished requirement. Contract completion does not fabricate revenue or payment records.

## Verification

`tests/contract-provisioning.test.mjs` uses real SQLite and mocked mail delivery. Covers missing signatures, wrong accounts, irrelevant events, atomic account creation, encrypted link storage, delivery retry with the same link, duplicate completion events, existing accounts, context-bound encryption and admin-only status.

Provider references: [DocuSign JSON SIM and HMAC](https://www.docusign.com/blog/developers/event-notifications-using-json-sim-and-hmac), [raw-body signature verification](https://www.docusign.com/blog/developers/manually-authenticating-hmac-signatures-docusign-connect-webhook-configurations).

## Sending a contract (added 2026-10-17, ticket #80)

The operator sends the contract from the booked pipeline (pulsify-saas CRM, Call booked card). `functions/api/contracts.js` saves it as a draft and, on Send, creates the DocuSign envelope (`_shared/docusign.js`, JWT grant) with the agreement from `_shared/contract-text.js`. The envelope carries `pulsify_portal=true`, so signing runs the flow above. Extra secrets: DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_PRIVATE_KEY (optional DOCUSIGN_OPERATOR_EMAIL/NAME for a counter-signature). In Connect also enable envelope-sent, envelope-declined and envelope-voided so the pipeline shows them. Migration 0080. Test: `node tests/contracts.test.mjs`. Never run against a real account yet.
