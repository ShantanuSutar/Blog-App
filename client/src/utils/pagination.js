export const readPaginatedList = (payload, key) => {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.[key])
      ? payload[key]
      : [];

  const fallbackTotal = items.length;
  const pagination = payload?.pagination || {
    page: 1,
    limit: fallbackTotal,
    total: fallbackTotal,
    totalPages: fallbackTotal > 0 ? 1 : 0,
    hasNext: false,
    hasPrevious: false,
  };

  return { items, pagination };
};

export const mergeUniqueById = (current, incoming) => {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...incoming.filter((item) => !seen.has(item.id))];
};

export const decrementPaginationTotal = (pagination) => {
  if (!pagination) return pagination;
  const total = Math.max(0, pagination.total - 1);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pagination.limit);
  return {
    ...pagination,
    total,
    totalPages,
    hasNext: pagination.page < totalPages,
    hasPrevious: pagination.page > 1 && totalPages > 0,
  };
};
