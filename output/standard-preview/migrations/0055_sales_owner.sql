-- Existing clients with no sales roster start with themselves as the lead closer.
INSERT INTO team_members (id,client_id,name,role,active,created_at,updated_at)
SELECT 'rep_' || lower(hex(randomblob(8))), c.client, 'You', 'closer', 1,
       strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
FROM client_config c WHERE c.status IN ('client','demo')
AND NOT EXISTS (SELECT 1 FROM team_members m WHERE m.client_id=c.client);
