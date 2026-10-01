export const getPostTags = (value) => {
  if (!value) return [];

  try {
    const tags = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim())
      : [];
  } catch {
    return [];
  }
};

export const getPostExcerpt = (html, maxLength = 160) => {
  if (!html) return "";
  const text = new DOMParser().parseFromString(html, "text/html").body.textContent?.replace(/\s+/g, " ").trim() || "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
};

export const formatPostDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const formatViewCount = (value) => {
  const count = Number(value);
  if (!Number.isFinite(count) || count <= 0) return "";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(count);
};
