import { sanitizePlainText } from "../utils/content.js";
import { authSecurity } from "../security/auth.js";
import {
  arrayValue,
  booleanValue,
  dateValue,
  enumValue,
  failValidation,
  objectValue,
  positiveIntegerValue,
  rejectUnknownFields,
  stringValue,
} from "./core.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-zA-Z0-9_]+$/;
const categories = [
  "art",
  "scitech",
  "tech",
  "technology",
  "science",
  "sports",
  "cinema",
  "food",
  "travel",
];
const reactionTypes = ["like", "love", "celebrate"];
const activityFilters = ["all", "posts", "comments", "reactions", "follows"];

const validateBody = (value, allowedFields) => {
  const body = objectValue(value);
  rejectUnknownFields(body, allowedFields);
  return body;
};

const validateQueryObject = (value, allowedFields) => {
  const query = objectValue(value || {}, "Query parameters");
  rejectUnknownFields(query, allowedFields, "Query parameters");
  return query;
};

const validateParamsObject = (value, allowedFields) => {
  const params = objectValue(value || {}, "Route parameters");
  rejectUnknownFields(params, allowedFields, "Route parameters");
  return params;
};

const optionalBoolean = (value, field) =>
  booleanValue(value, { field, required: false });

const plainTextValue = (value, options) => {
  const rawValue = stringValue(value, options);
  if (rawValue === undefined) return undefined;

  return stringValue(sanitizePlainText(rawValue), {
    ...options,
    trim: true,
  });
};

const normalizeTags = (value, { required = false } = {}) => {
  const tags = arrayValue(value, {
    field: "tags",
    required,
    maxItems: 8,
    item: (tag) => plainTextValue(tag, {
      field: "tags",
      min: 1,
      max: 40,
      pattern: /^[^\u0000-\u001f\u007f]+$/,
      patternMessage: "Tags cannot contain control characters",
    }),
  });

  if (tags === undefined) return undefined;
  const seen = new Set();
  for (const tag of tags) {
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      failValidation("Tags must be unique", "TAGS_DUPLICATE", "tags");
    }
    seen.add(key);
  }
  return tags;
};

const normalizeImage = (value, { required = false } = {}) => {
  const image = stringValue(value, {
    field: "img",
    required,
    max: 2048,
    allowEmpty: true,
  });
  if (!image) return image;

  if (/[\u0000-\u001f\u007f\\]/.test(image) || image.includes("..")) {
    failValidation("Image URL is invalid", "IMAGE_URL_INVALID", "img");
  }

  if (/^[a-z][a-z\d+.-]*:/i.test(image)) {
    let parsed;
    try {
      parsed = new URL(image);
    } catch {
      failValidation("Image URL is invalid", "IMAGE_URL_INVALID", "img");
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      failValidation("Image URL must use HTTP or HTTPS", "IMAGE_URL_INVALID", "img");
    }
  } else if (image.startsWith("//")) {
    failValidation("Image URL is invalid", "IMAGE_URL_INVALID", "img");
  }

  return image;
};

const normalizeRichText = (value, { required = false } = {}) => {
  const content = stringValue(value, {
    field: "desc",
    required,
    max: 250_000,
    trim: false,
    allowEmpty: true,
  });
  if (content === undefined) return undefined;
  return content;
};

const requireReadableContent = (content) => {
  if (!sanitizePlainText(content)) {
    failValidation("Article content is required", "POST_CONTENT_REQUIRED", "desc");
  }
};

const normalizeCategory = (value, { required = false } = {}) => {
  if ((value === undefined || value === "") && !required) return value === "" ? "" : undefined;
  return enumValue(value, categories, { field: "cat", required });
};

const normalizeSchedule = (value, { required = false } = {}) =>
  dateValue(value, {
    field: "scheduled_publish_date",
    required,
    nullable: true,
    future: value !== null && value !== undefined,
  });

const normalizePagination = (query, { maxLimit = 100, allowedFields = [] } = {}) => {
  const allowed = ["page", "limit", ...allowedFields];
  const source = validateQueryObject(query, allowed);
  const normalized = {};
  if (source.page !== undefined) {
    normalized.page = positiveIntegerValue(source.page, { field: "page", max: 100_000 });
  }
  if (source.limit !== undefined) {
    normalized.limit = positiveIntegerValue(source.limit, { field: "limit", max: maxLimit });
  }
  return { source, normalized };
};

export const registerBody = (value) => {
  const body = validateBody(value, ["username", "email", "password"]);
  const password = stringValue(body.password, {
    field: "password",
    min: 6,
    max: 128,
    trim: false,
  });
  if (Buffer.byteLength(password, "utf8") > authSecurity.maximumPasswordBytes) {
    failValidation(
      "password must be no more than 72 bytes",
      "PASSWORD_TOO_LONG",
      "password",
    );
  }

  return {
    username: stringValue(body.username, {
      field: "username",
      min: 3,
      max: 30,
      pattern: usernamePattern,
      patternMessage: "Username can contain only letters, numbers, and underscores",
    }),
    email: stringValue(body.email, {
      field: "email",
      max: 254,
      lowercase: true,
      pattern: emailPattern,
      patternMessage: "Email address is invalid",
    }),
    password,
  };
};

export const loginBody = (value) => {
  const body = validateBody(value, ["username", "password"]);
  return {
    username: stringValue(body.username, { field: "username", min: 1, max: 100 }),
    password: stringValue(body.password, { field: "password", min: 1, max: 128, trim: false }),
  };
};

export const postCreateBody = (value) => {
  const body = validateBody(value, [
    "title",
    "desc",
    "img",
    "cat",
    "date",
    "draft",
    "scheduled_publish_date",
    "tags",
    "featured",
  ]);
  const draft = optionalBoolean(body.draft, "draft") ?? false;
  const schedule = normalizeSchedule(body.scheduled_publish_date, { required: false });
  const isDraft = draft || Boolean(schedule);
  const desc = normalizeRichText(body.desc, { required: !isDraft });
  const cat = normalizeCategory(body.cat, { required: !isDraft });

  if (!isDraft) requireReadableContent(desc);

  return {
    title: plainTextValue(body.title, { field: "title", min: 1, max: 140 }),
    desc: desc ?? "",
    img: normalizeImage(body.img, { required: false }) ?? "",
    cat: cat ?? "",
    ...(body.date !== undefined
      ? { date: dateValue(body.date, { field: "date" }) }
      : {}),
    draft,
    scheduled_publish_date: schedule ?? null,
    tags: normalizeTags(body.tags, { required: false }) ?? [],
    featured: optionalBoolean(body.featured, "featured") ?? false,
  };
};

export const postUpdateBody = (value) => {
  const body = validateBody(value, [
    "title",
    "desc",
    "img",
    "cat",
    "draft",
    "scheduled_publish_date",
    "tags",
    "featured",
  ]);
  if (Object.keys(body).length === 0) {
    failValidation("No fields to update", "POST_UPDATE_EMPTY");
  }

  const normalized = {};
  if (body.title !== undefined) {
    normalized.title = plainTextValue(body.title, { field: "title", min: 1, max: 140 });
  }
  if (body.desc !== undefined) {
    normalized.desc = normalizeRichText(body.desc, { required: true });
  }
  if (body.img !== undefined) normalized.img = normalizeImage(body.img, { required: true });
  if (body.cat !== undefined) normalized.cat = normalizeCategory(body.cat, { required: false });
  if (body.draft !== undefined) normalized.draft = booleanValue(body.draft, { field: "draft" });
  if (body.scheduled_publish_date !== undefined) {
    normalized.scheduled_publish_date = normalizeSchedule(body.scheduled_publish_date, { required: true });
  }
  if (body.tags !== undefined) normalized.tags = normalizeTags(body.tags, { required: true });
  if (body.featured !== undefined) {
    normalized.featured = booleanValue(body.featured, { field: "featured" });
  }

  if (normalized.draft === false && normalized.desc !== undefined) {
    requireReadableContent(normalized.desc);
  }
  if (normalized.scheduled_publish_date && normalized.desc !== undefined) {
    requireReadableContent(normalized.desc);
  }
  return normalized;
};

export const postIdParams = (value) => {
  const params = validateParamsObject(value, ["id"]);
  return { id: positiveIntegerValue(params.id, { field: "postId" }) };
};

export const postTagParams = (value) => {
  const params = validateParamsObject(value, ["tag"]);
  return {
    tag: stringValue(params.tag, {
      field: "tag",
      min: 1,
      max: 40,
      pattern: /^[^\u0000-\u001f\u007f]+$/,
    }),
  };
};

export const postsQuery = (value) => {
  const { source, normalized } = normalizePagination(value, {
    maxLimit: 100,
    allowedFields: ["search", "cat", "tag"],
  });
  if (source.search !== undefined) {
    const search = stringValue(source.search, {
      field: "search",
      max: 100,
      allowEmpty: true,
    });
    if (search) normalized.search = search;
  }
  if (source.cat !== undefined && source.cat !== "") {
    normalized.cat = enumValue(source.cat, categories, { field: "cat" });
  }
  if (source.tag !== undefined) {
    const tag = stringValue(source.tag, {
      field: "tag",
      max: 40,
      allowEmpty: true,
      pattern: /^[^\u0000-\u001f\u007f]+$/,
    });
    if (tag) normalized.tag = tag;
  }
  return normalized;
};

export const listPaginationQuery = (value) => {
  const { normalized } = normalizePagination(value, { maxLimit: 100 });
  return normalized;
};

export const popularPostsQuery = (value) => {
  const { normalized } = normalizePagination(value, { maxLimit: 50 });
  if (normalized.page !== undefined) {
    failValidation("page is not supported for popular posts", "UNSUPPORTED_FIELDS", "page");
  }
  return normalized.limit === undefined ? {} : { limit: normalized.limit };
};

export const commentBody = (value) => {
  const body = validateBody(value, ["comment"]);
  const comment = sanitizePlainText(stringValue(body.comment, {
    field: "comment",
    min: 1,
    max: 10_000,
  }));
  if (!comment) failValidation("Comment is required", "COMMENT_REQUIRED", "comment");
  if (comment.length > 5_000) {
    failValidation("Comment must be no more than 5000 characters", "FIELD_TOO_LONG", "comment");
  }
  return { comment };
};

export const profileBody = (value) => {
  const body = validateBody(value, ["bio"]);
  return {
    bio: plainTextValue(body.bio, {
      field: "bio",
      max: 500,
      allowEmpty: true,
    }),
  };
};

export const usernameParams = (value) => {
  const params = validateParamsObject(value, ["username"]);
  return {
    username: stringValue(params.username, {
      field: "username",
      min: 1,
      max: 100,
      pattern: usernamePattern,
      patternMessage: "Username has an invalid format",
    }),
  };
};

export const userSearchQuery = (value) => {
  const query = validateQueryObject(value, ["query"]);
  return {
    query: stringValue(query.query, {
      field: "query",
      min: 1,
      max: 100,
      pattern: usernamePattern,
      patternMessage: "Search query has an invalid format",
    }),
  };
};

export const userIdParams = (value) => {
  const params = validateParamsObject(value, ["userId"]);
  return { userId: positiveIntegerValue(params.userId, { field: "userId" }) };
};

export const ownedUserIdParams = (value) => {
  const params = validateParamsObject(value, ["id"]);
  return { id: positiveIntegerValue(params.id, { field: "userId" }) };
};

export const bookmarkBody = (value) => {
  const body = validateBody(value, ["postId"]);
  return { postId: positiveIntegerValue(body.postId, { field: "postId" }) };
};

export const bookmarkCountsBody = (value) => {
  const body = validateBody(value, ["postIds"]);
  const postIds = arrayValue(body.postIds, {
    field: "postIds",
    maxItems: 100,
    item: (postId) => positiveIntegerValue(postId, { field: "postIds" }),
  });
  if (postIds.length === 0) {
    failValidation("postIds must contain at least one ID", "POST_IDS_INVALID", "postIds");
  }
  return { postIds: [...new Set(postIds)] };
};

export const bookmarkPostIdParams = (value) => {
  const params = validateParamsObject(value, ["postId"]);
  return { postId: positiveIntegerValue(params.postId, { field: "postId" }) };
};

export const reactionBody = (value) => {
  const body = validateBody(value, ["postId", "commentId", "reactionType"]);
  const postId = positiveIntegerValue(body.postId, { field: "postId", required: false });
  const commentId = positiveIntegerValue(body.commentId, { field: "commentId", required: false });
  if (Boolean(postId) === Boolean(commentId)) {
    failValidation(
      "Exactly one post ID or comment ID is required",
      "REACTION_TARGET_INVALID",
    );
  }
  return {
    ...(postId ? { postId } : {}),
    ...(commentId ? { commentId } : {}),
    reactionType: enumValue(body.reactionType ?? "like", reactionTypes, {
      field: "reactionType",
    }),
  };
};

const reactionTargetParams = (value, field) => {
  const params = validateParamsObject(value, [field]);
  return { [field]: positiveIntegerValue(params[field], { field }) };
};

export const reactionPostParams = (value) => reactionTargetParams(value, "postId");
export const reactionCommentParams = (value) => reactionTargetParams(value, "commentId");

export const reactionIdParams = (value) => {
  const params = validateParamsObject(value, ["reactionId"]);
  return { reactionId: positiveIntegerValue(params.reactionId, { field: "reactionId" }) };
};

export const activityQuery = (value) => {
  const { source, normalized } = normalizePagination(value, {
    maxLimit: 100,
    allowedFields: ["filter"],
  });
  normalized.filter = enumValue(source.filter ?? "all", activityFilters, { field: "filter" });
  return normalized;
};

export const newsletterBody = (value) => {
  const body = validateBody(value, ["email"]);
  return {
    email: stringValue(body.email, {
      field: "email",
      max: 254,
      lowercase: true,
      pattern: emailPattern,
      patternMessage: "Email address is invalid",
    }),
  };
};

export const unsubscribeQuery = (value) => {
  const query = validateQueryObject(value, ["token"]);
  return {
    token: stringValue(query.token, { field: "token", min: 1, max: 4096 }),
  };
};
