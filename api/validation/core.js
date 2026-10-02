import { ApiError } from "../errors/ApiError.js";

export const failValidation = (message, code = "VALIDATION_ERROR", field) => {
  throw new ApiError(
    400,
    message,
    code,
    field ? { field } : undefined,
  );
};

export const objectValue = (value, label = "Request body") => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failValidation(`${label} must be an object`, "REQUEST_OBJECT_INVALID");
  }
  return value;
};

export const rejectUnknownFields = (value, allowedFields, label = "Request body") => {
  const unknownFields = Object.keys(value).filter((field) => !allowedFields.includes(field));
  if (unknownFields.length > 0) {
    failValidation(
      `${label} contains unsupported field${unknownFields.length === 1 ? "" : "s"}`,
      "UNSUPPORTED_FIELDS",
      unknownFields[0],
    );
  }
};

export const stringValue = (
  value,
  {
    field,
    required = true,
    min = 0,
    max,
    trim = true,
    lowercase = false,
    pattern,
    patternMessage,
    allowEmpty = false,
  },
) => {
  if (value === undefined || value === null) {
    if (!required) return undefined;
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }
  if (typeof value !== "string") {
    failValidation(`${field} must be text`, "FIELD_TYPE_INVALID", field);
  }

  let normalized = trim ? value.trim() : value;
  if (lowercase) normalized = normalized.toLowerCase();

  if (!allowEmpty && normalized.length === 0) {
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }
  if (normalized.length < min) {
    failValidation(`${field} must be at least ${min} characters`, "FIELD_TOO_SHORT", field);
  }
  if (max !== undefined && normalized.length > max) {
    failValidation(`${field} must be no more than ${max} characters`, "FIELD_TOO_LONG", field);
  }
  if (pattern && normalized && !pattern.test(normalized)) {
    failValidation(patternMessage || `${field} has an invalid format`, "FIELD_FORMAT_INVALID", field);
  }

  return normalized;
};

export const booleanValue = (value, { field, required = true } = {}) => {
  if (value === undefined) {
    if (!required) return undefined;
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }
  if (typeof value !== "boolean") {
    failValidation(`${field} must be true or false`, "FIELD_TYPE_INVALID", field);
  }
  return value;
};

export const positiveIntegerValue = (
  value,
  { field, required = true, max = 2_147_483_647 } = {},
) => {
  if (value === undefined || value === null || value === "") {
    if (!required) return undefined;
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }

  const normalized = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  if (!Number.isInteger(normalized) || normalized <= 0 || normalized > max) {
    failValidation(`${field} must be a positive integer`, "ID_INVALID", field);
  }
  return normalized;
};

export const enumValue = (value, allowedValues, { field, required = true } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (!required) return undefined;
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }
  if (typeof value !== "string" || !allowedValues.includes(value)) {
    failValidation(`${field} is not supported`, "FIELD_VALUE_INVALID", field);
  }
  return value;
};

export const dateValue = (
  value,
  { field, required = true, nullable = false, future = false } = {},
) => {
  if (value === null && nullable) return null;
  if (value === undefined || value === "") {
    if (!required) return undefined;
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }
  if (typeof value !== "string" && !(value instanceof Date)) {
    failValidation(`${field} must be a valid date and time`, "DATE_INVALID", field);
  }

  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (typeof normalizedValue === "string" && normalizedValue.length > 100) {
    failValidation(`${field} must be a valid date and time`, "DATE_INVALID", field);
  }

  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    failValidation(`${field} must be a valid date and time`, "DATE_INVALID", field);
  }
  if (future && date.getTime() <= Date.now()) {
    failValidation(`${field} must be in the future`, "DATE_NOT_FUTURE", field);
  }
  return date.toISOString();
};

export const arrayValue = (
  value,
  { field, required = true, maxItems, item },
) => {
  if (value === undefined) {
    if (!required) return undefined;
    failValidation(`${field} is required`, "FIELD_REQUIRED", field);
  }
  if (!Array.isArray(value)) {
    failValidation(`${field} must be a list`, "FIELD_TYPE_INVALID", field);
  }
  if (maxItems !== undefined && value.length > maxItems) {
    failValidation(`${field} can contain at most ${maxItems} items`, "ARRAY_TOO_LARGE", field);
  }
  return item ? value.map((entry, index) => item(entry, index)) : [...value];
};
