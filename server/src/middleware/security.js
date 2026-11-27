import { ApiError } from "../utils/ApiError.js";

const containsUnsafeKey = (value, depth = 0) => {
  if (depth > 20) return true;
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((entry) => containsUnsafeKey(entry, depth + 1));

  return Object.entries(value).some(
    ([key, entry]) =>
      key.includes("$") ||
      key.includes(".") ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      containsUnsafeKey(entry, depth + 1)
  );
};

export const rejectMongoOperators = (req, res, next) => {
  if ([req.body, req.query, req.params].some((value) => containsUnsafeKey(value))) {
    return next(new ApiError(400, "Invalid request field"));
  }
  return next();
};

const isMutation = (method) => !["GET", "HEAD", "OPTIONS"].includes(method);

export const protectCookieMutations = (req, res, next) => {
  if (!isMutation(req.method) || !req.cookies?.refreshToken) return next();

  const isJson = req.is("application/json");
  const hasRequestedWithHeader = req.get("X-Requested-With") === "XMLHttpRequest";
  const isAuthenticatedUpload =
    req.is("multipart/form-data") && req.get("authorization")?.startsWith("Bearer ");

  if (isJson || hasRequestedWithHeader || isAuthenticatedUpload) return next();
  return next(new ApiError(403, "Invalid request type"));
};
