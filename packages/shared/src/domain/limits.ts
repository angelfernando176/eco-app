/** Límites y constantes de negocio definidos en el prompt del proyecto. */

export const LIMITS = {
  /** Skills permitidos sin suscripción. */
  skillsWithoutSubscription: 1,
  /** Skills permitidos con suscripción activa. */
  skillsWithSubscription: 10,
  /** Negocios permitidos sin suscripción. */
  businessesWithoutSubscription: 1,
  /** Imágenes de producto permitidas con suscripción. */
  productImagesWithSubscription: 7,
  /** Videos permitidos con suscripción (1 por producto, máximo 7 productos). */
  videosWithSubscription: 7,
} as const

/** Radios de búsqueda disponibles en la app móvil (km). */
export const SEARCH_RADII_KM = [5, 10, 20, 50, 100] as const

export type SearchRadiusKm = (typeof SEARCH_RADII_KM)[number]
