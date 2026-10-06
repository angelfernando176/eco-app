/** Single source of truth for user form field limits (used by both validation and input maxLength). */
export const USER_FIELD_LIMITS = {
  firstName: { min: 2, max: 50 },
  lastName: { min: 2, max: 50 },
} as const
