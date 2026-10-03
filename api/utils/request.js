export const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getPagination = (
  query = {},
  { defaultLimit = 20, maxLimit = 100 } = {},
) => {
  const page = parsePositiveInteger(query.page) || 1;
  const requestedLimit = parsePositiveInteger(query.limit) || defaultLimit;
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const createPaginationMetadata = ({ page, limit, total }) => {
  const normalizedTotal = Math.max(0, Number(total) || 0);
  const totalPages = normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / limit);

  return {
    page,
    limit,
    total: normalizedTotal,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1 && totalPages > 0,
  };
};
