export const PUBLIC_POST_COLUMNS = `
  p.id,
  p.title,
  p."desc",
  p.img,
  p.cat,
  p.date,
  p.uid,
  p.draft,
  p.scheduled_publish_date,
  p.tags,
  p.featured,
  p.views
`;

const MATCHED_POST_COLUMNS = PUBLIC_POST_COLUMNS.replaceAll("p.", "matches.");

const escapeLikePattern = (value) => value.replace(/[!%_]/g, "!$&");

export const buildPostFeedQueries = ({
  search,
  cat,
  tag,
  limit,
  offset,
}) => {
  const values = [];
  const conditions = [
    "p.draft = false",
    "(p.scheduled_publish_date IS NULL OR p.scheduled_publish_date <= CURRENT_TIMESTAMP)",
  ];

  if (cat) {
    values.push(cat);
    conditions.push(`p.cat = $${values.length}`);
  }

  if (tag) {
    values.push(JSON.stringify([tag]));
    conditions.push(`p.tags::jsonb @> $${values.length}::jsonb`);
  }

  if (search) {
    values.push(search);
    const queryIndex = values.length;
    values.push(`%${escapeLikePattern(search)}%`);
    const fallbackIndex = values.length;

    const fallbackMatch = `(
      p.title ILIKE $${fallbackIndex} ESCAPE '!'
      OR regexp_replace(p."desc", '<[^>]*>', ' ', 'g') ILIKE $${fallbackIndex} ESCAPE '!'
      OR p.cat ILIKE $${fallbackIndex} ESCAPE '!'
      OR p.tags::text ILIKE $${fallbackIndex} ESCAPE '!'
    )`;
    const rankExpression = `CASE
      WHEN p.title ILIKE $${fallbackIndex} ESCAPE '!' THEN 1.0
      WHEN p.cat ILIKE $${fallbackIndex} ESCAPE '!'
        OR p.tags::text ILIKE $${fallbackIndex} ESCAPE '!' THEN 0.4
      ELSE 0.2
    END`;
    const searchQuery = `websearch_to_tsquery('english', $${queryIndex})`;
    const whereClause = conditions.join("\n        AND ");
    const countParams = [...values];
    values.push(limit, offset);

    return {
      rowsQuery: `
        SELECT ${MATCHED_POST_COLUMNS}, matches.username, matches."userAvatar"
        FROM (
          SELECT ${PUBLIC_POST_COLUMNS}, u.username, u.avatar AS "userAvatar",
            ts_rank_cd(
              '{0.05, 0.2, 0.4, 1.0}'::real[],
              p.search_vector,
              ${searchQuery},
              32
            ) AS search_rank
          FROM posts p
          JOIN users u ON u.id = p.uid
          WHERE ${whereClause}
            AND numnode(${searchQuery}) > 0
            AND p.search_vector @@ ${searchQuery}

          UNION ALL

          SELECT ${PUBLIC_POST_COLUMNS}, u.username, u.avatar AS "userAvatar",
            ${rankExpression} AS search_rank
          FROM posts p
          JOIN users u ON u.id = p.uid
          WHERE ${whereClause}
            AND numnode(${searchQuery}) = 0
            AND ${fallbackMatch}
        ) matches
        ORDER BY search_rank DESC, date DESC, id DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      rowsParams: values,
      countQuery: `
        SELECT COUNT(*)
        FROM (
          SELECT p.id
          FROM posts p
          WHERE ${whereClause}
            AND numnode(${searchQuery}) > 0
            AND p.search_vector @@ ${searchQuery}

          UNION ALL

          SELECT p.id
          FROM posts p
          WHERE ${whereClause}
            AND numnode(${searchQuery}) = 0
            AND ${fallbackMatch}
        ) matches
      `,
      countParams,
    };
  }

  const fromClause = `
    FROM posts p
    JOIN users u ON u.id = p.uid
  `;
  const whereClause = `WHERE ${conditions.join("\n      AND ")}`;
  const countParams = [...values];
  values.push(limit, offset);

  return {
    rowsQuery: `
      SELECT ${PUBLIC_POST_COLUMNS}, u.username, u.avatar AS "userAvatar"
      ${fromClause}
      ${whereClause}
      ORDER BY p.date DESC, p.id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `,
    rowsParams: values,
    countQuery: `SELECT COUNT(*) ${fromClause} ${whereClause}`,
    countParams,
  };
};
