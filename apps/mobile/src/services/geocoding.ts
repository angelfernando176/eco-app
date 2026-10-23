/**
 * Forward geocoding (search-as-you-type) via Nominatim, same provider used
 * for reverse geocoding in apps/web/src/features/businesses/BusinessForm.tsx.
 * Uses Nominatim's structured query mode (city/street params) instead of a
 * single free-text "q" to avoid overly generic city-level matches.
 */

export interface PlaceSuggestion {
  label: string
  latitude: number
  longitude: number
}

export interface StructuredAddressQuery {
  city: string
  mainStreet?: string
  secondaryStreet?: string
}

const MIN_CITY_LENGTH = 3
const NOMINATIM_USER_AGENT = 'ECO-App/1.0 (soporte@eco.app)'

function mapNominatimResults(data: unknown): PlaceSuggestion[] {
  if (!Array.isArray(data)) {
    return []
  }
  return data.map((item: { display_name: string; lat: string; lon: string }) => ({
    label: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  }))
}

export async function searchPlacesStructured({
  city,
  mainStreet,
  secondaryStreet,
}: StructuredAddressQuery): Promise<PlaceSuggestion[]> {
  const cityTrimmed = city.trim()
  if (cityTrimmed.length < MIN_CITY_LENGTH) {
    return []
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '0',
    limit: '5',
    email: 'soporte@eco.app',
    city: cityTrimmed,
  })

  const street = [mainStreet?.trim(), secondaryStreet?.trim()].filter(Boolean).join(' y ')
  if (street) {
    params.set('street', street)
  }

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    })
    if (!response.ok) {
      return []
    }
    return mapNominatimResults(await response.json())
  } catch {
    return []
  }
}
