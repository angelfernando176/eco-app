/**
 * Forward geocoding (search-as-you-type) via Nominatim, same provider used
 * for reverse geocoding in apps/web/src/features/businesses/BusinessForm.tsx.
 */

export interface PlaceSuggestion {
  label: string
  latitude: number
  longitude: number
}

const MIN_QUERY_LENGTH = 3

export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return []
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=5&email=soporte@eco.app&q=${encodeURIComponent(trimmed)}`,
      { headers: { 'User-Agent': 'ECO-App/1.0 (soporte@eco.app)' } }
    )
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      return []
    }
    return data.map((item: { display_name: string; lat: string; lon: string }) => ({
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
    }))
  } catch {
    return []
  }
}
