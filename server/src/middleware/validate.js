import { ApiError } from "../utils/ApiError.js";

// validate(zodSchema) -> replaces req.body with the parsed (trimmed/normalized) data
export const validate = (schema, source = "body") => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    return next(new ApiError(400, details[0].message, details));
  }
  req[source] = result.data;
  next();
};
