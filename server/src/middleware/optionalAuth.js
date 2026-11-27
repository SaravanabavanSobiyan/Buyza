import { protect } from "./auth.js";

export const optionalAuth = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return protect(req, res, next);
};
