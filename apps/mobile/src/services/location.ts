import * as Location from 'expo-location'
import type { GeoPoint } from './geo'

export interface LocationSuccess {
  ok: true
  coords: GeoPoint
}

export interface LocationFailure {
  ok: false
  reason: 'denied' | 'unavailable' | 'services-disabled'
  message: string
}

export type LocationResult = LocationSuccess | LocationFailure

/** Requests foreground permission and reads the current position. Never throws. */
export async function getCurrentPosition(): Promise<LocationResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync()
    if (!servicesEnabled) {
      return {
        ok: false,
        reason: 'services-disabled',
        message: 'La ubicación del dispositivo está desactivada. Actívala en Configuración para buscar negocios cerca de ti.',
      }
    }

    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      return {
        ok: false,
        reason: 'denied',
        message: 'Necesitamos permiso de ubicación para buscar negocios cerca de ti. Habilítalo en los ajustes de la app.',
      }
    }

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    return {
      ok: true,
      coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
    }
  } catch {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'No se pudo obtener tu ubicación actual. Inténtalo de nuevo.',
    }
  }
}
