/** Per-plan limits for the catalog feature (negocios, productos, imágenes, videos, skills). */
export interface PlanLimits {
  /** `null` means unlimited (Administrador). */
  businesses: number | null
  products: number | null
  imagesPerProduct: number | null
  videosPerBusiness: number | null
  skills: number | null
  canUploadLogo: boolean
  canManageImages: boolean
  canManageVideos: boolean
  canMarkPrimarySecondary: boolean
}

const ADMIN_LIMITS: PlanLimits = {
  businesses: null,
  products: null,
  imagesPerProduct: null,
  videosPerBusiness: null,
  skills: null,
  canUploadLogo: true,
  canManageImages: true,
  canManageVideos: true,
  canMarkPrimarySecondary: true,
}

const FREE_LIMITS: PlanLimits = {
  businesses: 1,
  products: 1,
  imagesPerProduct: 0,
  videosPerBusiness: 0,
  skills: 1,
  canUploadLogo: false,
  canManageImages: false,
  canManageVideos: false,
  canMarkPrimarySecondary: false,
}

const SUBSCRIBED_LIMITS: PlanLimits = {
  businesses: 7,
  products: 7,
  imagesPerProduct: 7,
  videosPerBusiness: 2,
  skills: 10,
  canUploadLogo: true,
  canManageImages: true,
  canManageVideos: true,
  canMarkPrimarySecondary: false,
}

/** Single source of truth for the three plan tiers (admin / sin suscripción / con suscripción). */
export const PLAN_LIMITS = {
  admin: ADMIN_LIMITS,
  free: FREE_LIMITS,
  subscribed: SUBSCRIBED_LIMITS,
} as const
