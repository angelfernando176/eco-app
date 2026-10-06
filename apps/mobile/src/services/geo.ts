/**
 * Pure geo math (haversine distance, bounding box, map region sizing).
 * No dependencies on React Native, Expo or Supabase, so it can be
 * sanity-checked outside of the app (plain Node/tsx).
 */

export interface GeoPoint {
  latitude: number
  longitude: number
}

export const RADIUS_OPTIONS_KM = [5, 10, 20, 50, 100] as const
export type RadiusKm = (typeof RADIUS_OPTIONS_KM)[number]

const EARTH_RADIUS_KM = 6371
const KM_PER_DEG_LAT = 111.32
const MAX_ABS_LAT_FOR_COS = 89.9

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)))
}

export function withinRadius(center: GeoPoint, point: GeoPoint, radiusKm: number): boolean {
  return haversineKm(center, point) <= radiusKm
}

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
  /**
   * True when the box at this radius would cross the ±180° antimeridian.
   * In that case minLon/maxLon fall back to the full [-180, 180] range (no
   * longitude filter) and callers must rely on the exact haversine check
   * downstream to exclude out-of-radius points.
   */
  crossesAntimeridian: boolean
}

export function boundingBox(center: GeoPoint, radiusKm: number): BoundingBox {
  const latDelta = radiusKm / KM_PER_DEG_LAT
  const minLat = Math.max(center.latitude - latDelta, -90)
  const maxLat = Math.min(center.latitude + latDelta, 90)

  const referenceLat = Math.min(Math.max(Math.abs(minLat), Math.abs(maxLat)), MAX_ABS_LAT_FOR_COS)
  const cosLat = Math.cos(toRad(referenceLat))
  const fullLongitudeRange = { minLon: -180, maxLon: 180 }

  if (cosLat < 1e-6) {
    return { minLat, maxLat, ...fullLongitudeRange, crossesAntimeridian: false }
  }

  const lonDelta = radiusKm / (KM_PER_DEG_LAT * cosLat)
  if (lonDelta >= 180) {
    return { minLat, maxLat, ...fullLongitudeRange, crossesAntimeridian: false }
  }

  const rawMinLon = center.longitude - lonDelta
  const rawMaxLon = center.longitude + lonDelta

  if (rawMinLon < -180 || rawMaxLon > 180) {
    return { minLat, maxLat, ...fullLongitudeRange, crossesAntimeridian: true }
  }

  return { minLat, maxLat, minLon: rawMinLon, maxLon: rawMaxLon, crossesAntimeridian: false }
}

/** "850 m" under 1 km; "3,4 km" (comma decimal, es) from 1 km up. */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1).replace('.', ',')} km`
}

export interface MapRegion {
  latitude: number
  longitude: number
  latitudeDelta: number
  longitudeDelta: number
}

/** Padding so the radius circle fits comfortably inside the map viewport. */
const REGION_PADDING_FACTOR = 2.5

export function regionForRadius(center: GeoPoint, radiusKm: number): MapRegion {
  const latitudeDelta = Math.min((radiusKm * REGION_PADDING_FACTOR) / KM_PER_DEG_LAT, 180)
  const referenceLat = Math.min(Math.abs(center.latitude), MAX_ABS_LAT_FOR_COS)
  const cosLat = Math.cos(toRad(referenceLat))
  const longitudeDelta = cosLat < 1e-6 ? 180 : Math.min(latitudeDelta / cosLat, 360)

  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta,
    longitudeDelta,
  }
}
