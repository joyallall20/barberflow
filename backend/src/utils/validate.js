// utils/validate.js
import ApiError from "./ApiError.js";

export const parseOrThrow = (schema, data) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path?.length ? first.path.join(".") : "body";
    const message = first ? `${path}: ${first.message}` : "Validation failed";
    throw new ApiError(400, message, result.error.flatten());
  }
  return result.data;
};