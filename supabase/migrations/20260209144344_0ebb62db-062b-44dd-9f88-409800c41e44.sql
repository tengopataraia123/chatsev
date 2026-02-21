
-- Change fm_fixtures.scheduled_date from date to timestamptz to store exact match times
ALTER TABLE fm_fixtures ALTER COLUMN scheduled_date TYPE timestamp with time zone USING scheduled_date::timestamp with time zone;
