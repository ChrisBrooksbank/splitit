import type { LineItem, Person } from '../../types/index'
import type { PersonTip } from '../../store/tipStore'

export type SessionPhase = 'lobby' | 'claiming' | 'tips' | 'summary'

export interface SyncPayload {
  lineItems: LineItem[]
  people: Person[]
  assignments: Record<string, string[]>
  portions: Record<string, Record<string, number>>
  personTips: Record<string, PersonTip>
  phase: SessionPhase
  claimedPersonIds: string[]
}

export interface GuestInfo {
  peerId: string
  personId: string | null
  displayName: string | null
  connected: boolean
}

// Guest -> Host messages
export type GuestMessage =
  | { type: 'IDENTIFY'; personId: string; displayName: string }
  | { type: 'CLAIM_ITEM'; itemId: string; personId: string }
  | { type: 'UNCLAIM_ITEM'; itemId: string; personId: string }
  | {
      type: 'SET_ASSIGNEES'
      itemId: string
      personIds: string[]
      portions: Record<string, number>
    }
  | { type: 'SET_TIP'; personId: string; mode: 'percentage' | 'fixed'; value: number }

// Host -> Guest messages
export type HostMessage =
  | { type: 'SYNC_STATE'; payload: SyncPayload }
  | { type: 'PHASE_CHANGE'; phase: SessionPhase }

// Internal heartbeat messages — filtered before app-level validation
export type InternalMessage = { type: '__PING' } | { type: '__PONG' }
