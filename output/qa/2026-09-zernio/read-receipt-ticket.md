Subject: No message.read event for Instagram DMs (read receipts)

Hi, we connected Instagram account @ab.luiy (Zernio account id 6aaead238d284ffb211c3e71, profile Pulsify) on 2026-09-19 and registered webhook 6aaead25bf4d3b683569733e to https://pulsify-sync.abod-louai.workers.dev/hooks/zernio with events message.received, message.sent, message.read, message.deleted, conversation.started.

message.sent works: on 2026-09-19 at 16:32:45 UTC your log shows a successful delivery (202) for the outgoing message in conversation 825209400617652 (recipient @howtodosales, message id aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDY5NTY4NTE2MzA4OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI1OTk3NTkzMzE4MTQ4Njk4NjozMzAxNjYzODU0Mzg0MTQ2Njg1Nzg0Njg3NTgyNjk0NjA0OAZDZD).

The recipient opened that conversation in the Instagram app afterwards, but no message.read event was generated (your webhook log shows only the one message.sent), and GET /v1/inbox/conversations/825209400617652/messages returns deliveryStatus null and no readAt for that message.

Questions:
1. Does message.read fire for Instagram messages that were sent from the Instagram app on the phone, or only for messages sent through your API?
2. Is there anything on the Instagram account (business vs creator type, read receipts setting, connected tools) that has to be on for messaging_seen to reach you?
3. Can you see on your side whether Meta delivered a messaging_seen for that conversation at all?

Thanks.
