ALTER TABLE call_notes ADD COLUMN booking_ref TEXT;
ALTER TABLE call_notes ADD COLUMN lead_email TEXT;
ALTER TABLE call_notes ADD COLUMN source_kind TEXT;
CREATE INDEX IF NOT EXISTS call_notes_booking ON call_notes(client, booking_ref);
-- Link a legacy brief only when its exact date and named lead identify one booking.
UPDATE call_notes SET booking_ref=(
  SELECT MIN(t.external_id) FROM pipeline_touches t
  WHERE t.client_id=call_notes.client AND t.kind='booking' AND t.external_id NOT LIKE '%#canceled'
  AND julianday(COALESCE(json_extract(t.payload_json,'$.starts_at'),t.ts))=julianday(call_notes.call_date)
  AND substr(call_notes.title,17) IN (t.contact_email,t.contact_name)
), source_kind='precall'
WHERE title LIKE 'Pre-call brief: %' AND 1=(
  SELECT COUNT(DISTINCT t.external_id) FROM pipeline_touches t
  WHERE t.client_id=call_notes.client AND t.kind='booking' AND t.external_id NOT LIKE '%#canceled'
  AND julianday(COALESCE(json_extract(t.payload_json,'$.starts_at'),t.ts))=julianday(call_notes.call_date)
  AND substr(call_notes.title,17) IN (t.contact_email,t.contact_name)
);
