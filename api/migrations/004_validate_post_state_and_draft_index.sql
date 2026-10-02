-- Migration 002 added this constraint without scanning legacy rows. The data has
-- since been normalized, so validate it and let PostgreSQL trust the invariant.
ALTER TABLE posts VALIDATE CONSTRAINT posts_scheduled_must_be_draft_check;

-- The draft manager filters this exact state and orders by the edit date.
CREATE INDEX IF NOT EXISTS posts_user_drafts_date_idx
  ON posts (uid, date DESC, id DESC)
  WHERE draft = TRUE AND scheduled_publish_date IS NULL;
