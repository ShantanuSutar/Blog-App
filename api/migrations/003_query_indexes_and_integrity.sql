-- Authentication treats usernames and email addresses case-insensitively.
-- These indexes close the race left by application-level duplicate checks.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_username_lower_pattern_idx
  ON users (LOWER(username) text_pattern_ops);

-- Public post feeds use deterministic date ordering plus specific filters.
DROP INDEX IF EXISTS posts_public_date_idx;
CREATE INDEX IF NOT EXISTS posts_public_date_id_idx
  ON posts (date DESC, id DESC)
  WHERE draft = FALSE;

DROP INDEX IF EXISTS posts_user_date_idx;
CREATE INDEX IF NOT EXISTS posts_user_date_id_idx
  ON posts (uid, date DESC, id DESC);

CREATE INDEX IF NOT EXISTS posts_public_category_date_idx
  ON posts (cat, date DESC, id DESC)
  WHERE draft = FALSE;
CREATE INDEX IF NOT EXISTS posts_featured_date_idx
  ON posts (date DESC, id DESC)
  WHERE draft = FALSE AND featured = TRUE;
CREATE INDEX IF NOT EXISTS posts_popular_views_idx
  ON posts (views DESC, date DESC, id DESC)
  WHERE draft = FALSE;
CREATE INDEX IF NOT EXISTS posts_user_scheduled_idx
  ON posts (uid, scheduled_publish_date, id)
  WHERE draft = TRUE AND scheduled_publish_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_tags_gin_idx
  ON posts USING GIN ((tags::jsonb) jsonb_path_ops);

-- Match comment retrieval ordering and bookmark reverse lookups/counts.
DROP INDEX IF EXISTS comments_post_created_idx;
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (cpostid, id);
CREATE INDEX IF NOT EXISTS bookmarks_post_idx ON bookmarks (pid);
DROP INDEX IF EXISTS bookmarks_user_created_idx;
CREATE INDEX IF NOT EXISTS bookmarks_user_created_id_idx
  ON bookmarks (uid, created_at DESC, id DESC);

-- The product supports exactly one current reaction per user and target.
-- Retain the newest state if legacy data contains multiple reaction rows.
DELETE FROM reactions older
USING reactions newer
WHERE older.id < newer.id
  AND older.user_id = newer.user_id
  AND older.post_id IS NOT DISTINCT FROM newer.post_id
  AND older.comment_id IS NOT DISTINCT FROM newer.comment_id;

CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_post_unique
  ON reactions (user_id, post_id)
  WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_comment_unique
  ON reactions (user_id, comment_id)
  WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reactions_post_created_idx
  ON reactions (post_id, created_at DESC, id DESC)
  WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reactions_comment_created_idx
  ON reactions (comment_id, created_at DESC, id DESC)
  WHERE comment_id IS NOT NULL;

DROP INDEX IF EXISTS reactions_user_post_type_unique;
DROP INDEX IF EXISTS reactions_user_comment_type_unique;
ALTER TABLE reactions
  DROP CONSTRAINT IF EXISTS reactions_user_id_post_id_comment_id_reaction_type_key;

ALTER TABLE reactions VALIDATE CONSTRAINT reactions_single_target_check;
ALTER TABLE reactions VALIDATE CONSTRAINT reactions_type_check;
ALTER TABLE follows VALIDATE CONSTRAINT follows_no_self_follow_check;
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_check;

-- Follow lists filter by one side and sort by relationship creation time.
DROP INDEX IF EXISTS follows_following_idx;
DROP INDEX IF EXISTS idx_following;
DROP INDEX IF EXISTS idx_follower;
CREATE INDEX IF NOT EXISTS follows_following_created_idx
  ON follows (following_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS follows_follower_created_idx
  ON follows (follower_id, created_at DESC, id DESC);

-- Activity pages filter by actor/type or target and order chronologically.
DROP INDEX IF EXISTS activities_type_idx;
DROP INDEX IF EXISTS idx_activities_type;
DROP INDEX IF EXISTS idx_activities_user;
DROP INDEX IF EXISTS idx_activities_created;
DROP INDEX IF EXISTS activities_user_created_idx;
CREATE INDEX IF NOT EXISTS activities_created_idx
  ON activities (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS activities_user_created_id_idx
  ON activities (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS activities_user_type_created_idx
  ON activities (user_id, activity_type, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS activities_target_created_idx
  ON activities (target_user_id, created_at DESC, id DESC)
  WHERE target_user_id IS NOT NULL;
