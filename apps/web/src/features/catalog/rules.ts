/** Single source of truth for catalog text-field limits (used by validation and input maxLength). */
export const CATALOG_FIELD_LIMITS = {
  productName: { min: 3, max: 100 },
  productDescription: { min: 0, max: 500 },
  price: { min: 0, max: 99999999.99 },
  imageDescription: { min: 0, max: 200 },
  skillName: { min: 2, max: 30 },
} as const

export function validateProductName(name: string): string | null {
  const { min, max } = CATALOG_FIELD_LIMITS.productName
  const length = name.trim().length
  if (length < min || length > max) {
    return `El nombre debe tener entre ${min} y ${max} caracteres.`
  }
  return null
}

export function validateProductDescription(description: string): string | null {
  const { max } = CATALOG_FIELD_LIMITS.productDescription
  if (description.length > max) {
    return `La descripción no puede superar los ${max} caracteres.`
  }
  return null
}

function hasAtMostTwoDecimals(price: number): boolean {
  return Math.abs(Math.round(price * 100) - price * 100) < 1e-6
}

export function validatePrice(price: number): string | null {
  const { min, max } = CATALOG_FIELD_LIMITS.price
  if (!Number.isFinite(price) || price < min || price > max) {
    return `El precio debe ser un número entre ${min} y ${max}.`
  }
  if (!hasAtMostTwoDecimals(price)) {
    return 'El precio admite máximo 2 decimales.'
  }
  return null
}

export function validateImageDescription(description: string): string | null {
  const { max } = CATALOG_FIELD_LIMITS.imageDescription
  if (description.length > max) {
    return `La descripción no puede superar los ${max} caracteres.`
  }
  return null
}

export function validateSkillName(name: string): string | null {
  const { min, max } = CATALOG_FIELD_LIMITS.skillName
  const length = name.trim().length
  if (length < min || length > max) {
    return `La skill debe tener entre ${min} y ${max} caracteres.`
  }
  return null
}
