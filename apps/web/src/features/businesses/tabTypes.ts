import type { Business } from '@eco/shared'
import type { PlanLimits } from '../plan/limits'

/** Shared props contract for the business detail tab panels (Skills, Menú, Videos). */
export interface BusinessTabProps {
  business: Business
  plan: PlanLimits
  isAdmin: boolean
}
