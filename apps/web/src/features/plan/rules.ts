import { PLAN_LIMITS, type PlanLimits } from './limits'

export interface GetPlanLimitsParams {
  isAdmin: boolean
  hasActiveSubscription: boolean
}

/** Resolves the effective plan limits for a user (admin > suscripción activa > sin suscripción). */
export function getPlanLimits({ isAdmin, hasActiveSubscription }: GetPlanLimitsParams): PlanLimits {
  if (isAdmin) return PLAN_LIMITS.admin
  return hasActiveSubscription ? PLAN_LIMITS.subscribed : PLAN_LIMITS.free
}

/** `null` limit means unlimited. */
export function isUnderLimit(current: number, limit: number | null): boolean {
  if (limit === null) return true
  return current < limit
}
