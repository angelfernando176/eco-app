import type { ID } from './common'

export type SubscriptionStatus = 'active' | 'inactive'

export interface Subscription {
  id: ID
  userId: ID
  status: SubscriptionStatus
  activatedAt: string | null
}
