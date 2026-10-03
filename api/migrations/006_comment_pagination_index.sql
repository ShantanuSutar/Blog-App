-- Comment pages are read newest-first and use the primary key as a stable
-- tie-breaker when multiple comments share the same timestamp.
DROP INDEX IF EXISTS comments_post_id_idx;
CREATE INDEX IF NOT EXISTS comments_post_created_id_idx
  ON comments (cpostid, created_at DESC, id DESC);
