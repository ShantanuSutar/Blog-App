export const parsePositiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getPagination = (
  query,
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
