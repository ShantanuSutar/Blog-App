-- Store the weighted document once and maintain it only when searchable fields
-- change. A trigger is used instead of a generated column so this remains
-- compatible with legacy installations where tags is JSON rather than JSONB.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

CREATE OR REPLACE FUNCTION update_post_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.cat, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.tags::text, '')), 'B') ||
    setweight(
      to_tsvector(
        'english',
        regexp_replace(
          regexp_replace(COALESCE(NEW."desc", ''), '<[^>]*>', ' ', 'g'),
          '&[A-Za-z0-9#]+;',
          ' ',
          'g'
        )
      ),
      'C'
    );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS posts_search_vector_update ON posts;
CREATE TRIGGER posts_search_vector_update
BEFORE INSERT OR UPDATE OF title, "desc", cat, tags
ON posts
FOR EACH ROW
EXECUTE FUNCTION update_post_search_vector();

-- Backfill existing rows using the same expression as the trigger.
UPDATE posts
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(cat, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(tags::text, '')), 'B') ||
  setweight(
    to_tsvector(
      'english',
      regexp_replace(
        regexp_replace(COALESCE("desc", ''), '<[^>]*>', ' ', 'g'),
        '&[A-Za-z0-9#]+;',
        ' ',
        'g'
      )
    ),
    'C'
  );

ALTER TABLE posts ALTER COLUMN search_vector SET NOT NULL;

CREATE INDEX IF NOT EXISTS posts_published_search_vector_idx
  ON posts USING GIN (search_vector)
  WHERE draft = FALSE;
