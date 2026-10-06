import { db } from './database'

export interface Busqueda {
  id: number
  termino: string | null
  radioKm: number
  latitud: number
  longitud: number
  resultados: number
  createdAt: string
}

export interface NuevaBusqueda {
  termino?: string | null
  radioKm: number
  latitud: number
  longitud: number
  resultados: number
}

export function guardarBusqueda(input: NuevaBusqueda): void {
  db.runSync(
    'INSERT INTO busquedas (termino, radio_km, latitud, longitud, resultados) VALUES (?, ?, ?, ?, ?)',
    [input.termino ?? null, input.radioKm, input.latitud, input.longitud, input.resultados]
  )
}

export function listarBusquedasRecientes(limit = 10): Busqueda[] {
  const rows = db.getAllSync<{
    id: number
    termino: string | null
    radio_km: number
    latitud: number
    longitud: number
    resultados: number
    created_at: string
  }>('SELECT id, termino, radio_km, latitud, longitud, resultados, created_at FROM busquedas ORDER BY id DESC LIMIT ?', [limit])

  return rows.map((row) => ({
    id: row.id,
    termino: row.termino,
    radioKm: row.radio_km,
    latitud: row.latitud,
    longitud: row.longitud,
    resultados: row.resultados,
    createdAt: row.created_at,
  }))
}
