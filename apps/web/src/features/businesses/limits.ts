/** Single source of truth for business form field limits (used by both validation and input maxLength). */
export const BUSINESS_FIELD_LIMITS = {
  tradeName: { min: 3, max: 10 },
  ruc: { min: 10, max: 13 },
  phone: { minDigits: 8, max: 30 },
  representativeEmail: { max: 254 },
  latitude: { min: -90, max: 90 },
  longitude: { min: -180, max: 180 },
  mainStreet: { min: 3, max: 100 },
  secondaryStreet: { min: 3, max: 100 },
  number: { min: 3, max: 15 },
  reference: { min: 3, max: 300 },
} as const
