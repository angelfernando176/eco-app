import { supabase } from '../lib/supabase'
import { boundingBox, type GeoPoint } from './geo'
import { mergeBusinessResults, sanitizeSearchTerm, type BusinessResult, type BusinessRow } from './businessSearchLogic'

const BUSINESS_COLUMNS =
  'id, trade_name, ruc, phone, representative_email, logo_url, latitude, longitude, main_street, secondary_street, number, reference'
const ROW_LIMIT = 300

export interface SearchBusinessesInput {
  center: GeoPoint
  radiusKm: number
  term?: string
}

export async function searchBusinesses({ center, radiusKm, term }: SearchBusinessesInput): Promise<BusinessResult[]> {
  if (!supabase) {
    throw new Error('La app no está configurada para conectarse a Supabase.')
  }

  const box = boundingBox(center, radiusKm)
  const sanitizedTerm = term ? sanitizeSearchTerm(term) : ''

  let byNameQuery = supabase
    .from('businesses')
    .select(BUSINESS_COLUMNS)
    .gte('latitude', box.minLat)
    .lte('latitude', box.maxLat)
    .gte('longitude', box.minLon)
    .lte('longitude', box.maxLon)
    .limit(ROW_LIMIT)

  if (sanitizedTerm) {
    byNameQuery = byNameQuery.ilike('trade_name', `%${sanitizedTerm}%`)
  }

  const { data: byNameRows, error: byNameError } = await byNameQuery
  if (byNameError) {
    throw new Error(`No se pudo buscar negocios: ${byNameError.message}`)
  }

  const rowSets: BusinessRow[][] = [(byNameRows ?? []) as BusinessRow[]]

  if (sanitizedTerm) {
    const { data: skillRows, error: skillError } = await supabase
      .from('skills')
      .select('business_id')
      .ilike('name', `%${sanitizedTerm}%`)
      .limit(ROW_LIMIT)

    if (skillError) {
      throw new Error(`No se pudo buscar por palabra clave: ${skillError.message}`)
    }

    const businessIds = [...new Set((skillRows ?? []).map((row) => row.business_id as string))]

    if (businessIds.length > 0) {
      const { data: bySkillRows, error: bySkillError } = await supabase
        .from('businesses')
        .select(BUSINESS_COLUMNS)
        .in('id', businessIds)
        .gte('latitude', box.minLat)
        .lte('latitude', box.maxLat)
        .gte('longitude', box.minLon)
        .lte('longitude', box.maxLon)
        .limit(ROW_LIMIT)

      if (bySkillError) {
        throw new Error(`No se pudo buscar por palabra clave: ${bySkillError.message}`)
      }

      rowSets.push((bySkillRows ?? []) as BusinessRow[])
    }
  }

  return mergeBusinessResults(rowSets, center, radiusKm)
}
