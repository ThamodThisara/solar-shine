/**
 * Small input-validation helpers for route handlers. Each returns a cleaned value
 * or throws a `ValidationError`, which the router turns into a 400 response.
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed string capped at `max` chars. Empty → null unless `required`. */
export function str(value, field, { max = 255, required = false } = {}) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new ValidationError(`${field} must be text`);
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters`);
  }
  return trimmed;
}

export function email(value, field, { required = false } = {}) {
  const cleaned = str(value, field, { max: 255, required });
  if (cleaned && !EMAIL_RE.test(cleaned)) {
    throw new ValidationError(`${field} is not a valid email address`);
  }
  return cleaned ? cleaned.toLowerCase() : null;
}

/** Non-negative number, or null when empty. */
export function nonNegativeNumber(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new ValidationError(`${field} must be a non-negative number`);
  }
  return n;
}

/** ISO date/datetime string, or null when empty. */
export function isoDate(value, field) {
  if (value === undefined || value === null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ValidationError(`${field} must be a valid date`);
  }
  return d.toISOString();
}

/** One of `allowed`, or `fallback` when empty. */
export function oneOf(value, field, allowed, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value;
}
