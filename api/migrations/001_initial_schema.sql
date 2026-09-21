CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  "desc" TEXT NOT NULL DEFAULT '',
  img TEXT NOT NULL DEFAULT '',
  cat VARCHAR(50) NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  draft BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_publish_date TIMESTAMPTZ,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE posts ADD COLUMN IF NOT EXISTS draft BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_publish_date TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  comment TEXT NOT NULL,
  cpostid INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  cuserid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pid INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (uid, pid)
);

CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DELETE FROM reactions older
USING reactions newer
WHERE older.id > newer.id
  AND older.user_id = newer.user_id
  AND older.post_id IS NOT DISTINCT FROM newer.post_id
  AND older.comment_id IS NOT DISTINCT FROM newer.comment_id
  AND older.reaction_type = newer.reaction_type;

CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_post_type_unique
  ON reactions (user_id, post_id, reaction_type)
  WHERE post_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reactions_user_comment_type_unique
  ON reactions (user_id, comment_id, reaction_type)
  WHERE comment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS posts_public_date_idx ON posts (date DESC) WHERE draft = FALSE;
CREATE INDEX IF NOT EXISTS posts_user_date_idx ON posts (uid, date DESC);
CREATE INDEX IF NOT EXISTS comments_post_created_idx ON comments (cpostid, created_at);
CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx ON bookmarks (uid, created_at DESC);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows (following_id);
CREATE INDEX IF NOT EXISTS activities_user_created_idx ON activities (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activities_type_idx ON activities (activity_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reactions_single_target_check'
      AND conrelid = 'reactions'::regclass
  ) THEN
    ALTER TABLE reactions
      ADD CONSTRAINT reactions_single_target_check
      CHECK (num_nonnulls(post_id, comment_id) = 1) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reactions_type_check'
      AND conrelid = 'reactions'::regclass
  ) THEN
    ALTER TABLE reactions
      ADD CONSTRAINT reactions_type_check
      CHECK (reaction_type IN ('like', 'love', 'celebrate')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'follows_no_self_follow_check'
      AND conrelid = 'follows'::regclass
  ) THEN
    ALTER TABLE follows
      ADD CONSTRAINT follows_no_self_follow_check
      CHECK (follower_id <> following_id) NOT VALID;
  END IF;
END
$$;
