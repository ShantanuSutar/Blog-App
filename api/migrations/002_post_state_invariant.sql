UPDATE posts
SET draft = TRUE
WHERE scheduled_publish_date IS NOT NULL
  AND scheduled_publish_date > CURRENT_TIMESTAMP
  AND draft = FALSE;

UPDATE posts
SET scheduled_publish_date = NULL
WHERE scheduled_publish_date IS NOT NULL
  AND scheduled_publish_date <= CURRENT_TIMESTAMP
  AND draft = FALSE;

CREATE INDEX IF NOT EXISTS posts_scheduled_due_idx
  ON posts (scheduled_publish_date)
  WHERE draft = TRUE AND scheduled_publish_date IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'posts_scheduled_must_be_draft_check'
      AND conrelid = 'posts'::regclass
  ) THEN
    ALTER TABLE posts
      ADD CONSTRAINT posts_scheduled_must_be_draft_check
      CHECK (scheduled_publish_date IS NULL OR draft = TRUE) NOT VALID;
  END IF;
END
$$;
