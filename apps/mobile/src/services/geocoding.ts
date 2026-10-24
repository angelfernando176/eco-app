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

export interface CitySuggestion {
  name: string
}

const MIN_CITY_LENGTH = 3
const MIN_STREET_LENGTH = 3
const CITY_ADDRESS_TYPES = new Set(['city', 'town', 'village', 'municipality', 'hamlet'])
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

/** Autocomplete restricted to real city/town names, so the user can only pick a valid city. */
export async function searchCities(query: string): Promise<CitySuggestion[]> {
  const trimmed = query.trim()
  if (trimmed.length < MIN_CITY_LENGTH) {
    return []
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '0',
    limit: '8',
    email: 'soporte@eco.app',
    city: trimmed,
  })

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    })
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      return []
    }
    const names = new Set<string>()
    for (const item of data as Array<{ addresstype?: string; name?: string }>) {
      if (item.addresstype && CITY_ADDRESS_TYPES.has(item.addresstype) && item.name) {
        names.add(item.name)
      }
    }
    return Array.from(names).map((name) => ({ name }))
  } catch {
    return []
  }
}

/** Autocomplete restricted to real street names within a city, never a full address with number. */
export async function searchStreets(city: string, query: string): Promise<string[]> {
  const cityTrimmed = city.trim()
  const queryTrimmed = query.trim()
  if (cityTrimmed.length < MIN_CITY_LENGTH || queryTrimmed.length < MIN_STREET_LENGTH) {
    return []
  }

  const params = new URLSearchParams({
    format: 'jsonv2',
    addressdetails: '1',
    limit: '8',
    email: 'soporte@eco.app',
    city: cityTrimmed,
    street: queryTrimmed,
  })

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: { 'User-Agent': NOMINATIM_USER_AGENT },
    })
    if (!response.ok) {
      return []
    }
    const data = await response.json()
    if (!Array.isArray(data)) {
      return []
    }
    const names = new Set<string>()
    for (const item of data as Array<{ address?: { road?: string } }>) {
      if (item.address?.road) {
        names.add(item.address.road)
      }
    }
    return Array.from(names)
  } catch {
    return []
  }
}
