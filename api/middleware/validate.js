export const validateRequest = ({ body, params, query } = {}) =>
  (req, res, next) => {
    try {
      if (body) req.body = body(req.body);
      if (params) req.params = params(req.params);
      if (query) req.query = query(req.query);
      return next();
    } catch (error) {
      return next(error);
    }
  };
