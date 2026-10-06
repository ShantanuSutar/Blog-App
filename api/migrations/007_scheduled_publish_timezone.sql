-- Earlier versions of the project created this column as TIMESTAMP WITHOUT
-- TIME ZONE. API clients send ISO-8601 UTC instants, so those legacy values
-- represent UTC wall-clock values and must be interpreted as UTC during the
-- conversion. Without this conversion, PostgreSQL and browsers disagree by
-- the API server's local UTC offset when deciding whether a post is due.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'posts'
      AND column_name = 'scheduled_publish_date'
      AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE posts
      ALTER COLUMN scheduled_publish_date TYPE TIMESTAMPTZ
      USING scheduled_publish_date AT TIME ZONE 'UTC';
  END IF;
END
$$;
