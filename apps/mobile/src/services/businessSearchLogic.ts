/**
 * Pure row mapping, merging, filtering and sorting for business search.
 * Only depends on geo.ts (also dependency-free), so this can be
 * sanity-checked outside of Expo/React Native/Supabase.
 */

import { haversineKm, type GeoPoint } from './geo'

export interface BusinessRow {
  id: string
  trade_name: string
  ruc: string
  phone: string
  representative_email: string
  logo_url: string | null
  latitude: number
  longitude: number
  main_street: string
  secondary_street: string
  number: string
  reference: string
}

export interface BusinessResult {
  id: string
  tradeName: string
  ruc: string
  phone: string
  representativeEmail: string
  logoUrl: string | null
  latitude: number
  longitude: number
  mainStreet: string
  secondaryStreet: string
  number: string
  reference: string
  distanceKm: number
}

const MAX_TERM_LENGTH = 60

/** Strips characters that have special meaning in ilike patterns ('%') or PostgREST filter strings (',', '(', ')'). */
export function sanitizeSearchTerm(raw: string): string {
  return raw.trim().slice(0, MAX_TERM_LENGTH).replace(/[%,()]/g, '')
}

export function mapBusinessRow(row: BusinessRow, center: GeoPoint): BusinessResult {
  return {
    id: row.id,
    tradeName: row.trade_name,
    ruc: row.ruc,
    phone: row.phone,
    representativeEmail: row.representative_email,
    logoUrl: row.logo_url,
    latitude: row.latitude,
    longitude: row.longitude,
    mainStreet: row.main_street,
    secondaryStreet: row.secondary_street,
    number: row.number,
    reference: row.reference,
    distanceKm: haversineKm(center, { latitude: row.latitude, longitude: row.longitude }),
  }
}

/**
 * Merges one or more row sets (e.g. trade-name match + skill-keyword match),
 * de-duplicating by id, dropping rows beyond the radius (the bounding box
 * query is an approximation; this is the exact cut), and sorting by distance.
 */
export function mergeBusinessResults(
  rowSets: BusinessRow[][],
  center: GeoPoint,
  radiusKm: number
): BusinessResult[] {
  const byId = new Map<string, BusinessResult>()

  for (const rows of rowSets) {
    for (const row of rows) {
      if (byId.has(row.id)) continue
      const result = mapBusinessRow(row, center)
      if (result.distanceKm <= radiusKm) {
        byId.set(row.id, result)
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.distanceKm - b.distanceKm)
}
