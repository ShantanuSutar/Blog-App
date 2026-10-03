import { db } from "../db.js";
import { ApiError } from "../errors/ApiError.js";
import { createPaginationMetadata, getPagination } from "../utils/request.js";

const activityFilters = {
  all: null,
  posts: "post",
  comments: "comment",
  reactions: "reaction",
  follows: "follow",
};

const activitySelect = `
  SELECT
    a.id,
    a.user_id,
    a.activity_type,
    a.post_id,
    a.target_user_id,
    a.comment_id,
    a.created_at,
    u.username,
    u.avatar,
    p.title AS post_title,
    p.img AS post_img,
    c.comment AS comment_text,
    tu.username AS target_username,
    r.reaction_type
  FROM activities a
  JOIN users u ON a.user_id = u.id
  LEFT JOIN posts p ON a.post_id = p.id
  LEFT JOIN comments c ON a.comment_id = c.id
  LEFT JOIN users tu ON a.target_user_id = tu.id
  LEFT JOIN LATERAL (
    SELECT reaction_type
    FROM reactions
    WHERE user_id = a.user_id
      AND (
        (a.post_id IS NOT NULL AND post_id = a.post_id)
        OR (a.comment_id IS NOT NULL AND comment_id = a.comment_id)
      )
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  ) r ON true
`;

const getFilter = (value) => {
  const key = value || "all";
  return Object.hasOwn(activityFilters, key) ? activityFilters[key] : undefined;
};

const sendActivityPage = async (
  res,
  { whereClause, whereParams, activityType, page, limit, offset },
) => {
  const params = [...whereParams];
  let filteredWhereClause = whereClause;

  if (activityType) {
    params.push(activityType);
    filteredWhereClause += ` AND a.activity_type = $${params.length}`;
  }

  const countParams = [...params];
  params.push(limit, offset);
  const limitIndex = params.length - 1;
  const offsetIndex = params.length;

  const [activityResult, countResult] = await Promise.all([
    db.query(
      `${activitySelect}
       ${filteredWhereClause}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params,
    ),
    db.query(
      `SELECT COUNT(*) FROM activities a ${filteredWhereClause}`,
      countParams,
    ),
  ]);

  const totalCount = Number(countResult.rows[0].count);
  const pagination = createPaginationMetadata({ page, limit, total: totalCount });
  return res.status(200).json({
    activities: activityResult.rows,
    totalPages: pagination.totalPages,
    currentPage: page,
    pagination,
  });
};

export const getActivityFeed = async (req, res) => {
  const activityType = getFilter(req.query.filter);
  if (activityType === undefined) {
    throw new ApiError(400, "Invalid activity filter", "ACTIVITY_FILTER_INVALID");
  }

  const { page, limit, offset } = getPagination(req.query);

  return sendActivityPage(res, {
      whereClause: `
        WHERE (
          EXISTS (
            SELECT 1
            FROM follows f
            WHERE f.follower_id = $1
              AND f.following_id = a.user_id
          )
          OR a.target_user_id = $1
        )
      `,
      whereParams: [req.user.id],
      activityType,
      page,
      limit,
      offset,
  });
};

export const getUserActivities = async (req, res) => {
  const activityType = getFilter(req.query.filter);
  if (activityType === undefined) {
    throw new ApiError(400, "Invalid activity filter", "ACTIVITY_FILTER_INVALID");
  }

  const { page, limit, offset } = getPagination(req.query);

  if (req.params.username !== req.user.username) {
    throw new ApiError(404, "Activity feed not found", "ACTIVITY_NOT_FOUND");
  }

  return sendActivityPage(res, {
      whereClause: "WHERE a.user_id = $1",
      whereParams: [req.user.id],
      activityType,
      page,
      limit,
      offset,
  });
};
