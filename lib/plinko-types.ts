/**
 * PLINKO Game Types
 *
 * Designed to be blockchain-ready for future migration
 * Current: LocalStorage implementation
 * Future: Smart contract integration
 */

import { RiskLevel } from '@/app/PLINKO/types'

/**
 * Individual drop record
 * This structure mirrors what will be emitted as events from the smart contract
 */
export interface PlinkoDrop {
  id: string // Currently: UUID, Future: transaction hash
  timestamp: number // Currently: Date.now(), Future: block.timestamp
  player: string // Wallet address (already blockchain-ready)
  wager: number // Currently: number, Future: bigint (will migrate)
  multiplier: number
  winAmount: number
  profit: number // winAmount - wager
  riskLevel: RiskLevel
  bucketIndex: number

  // Future blockchain fields (optional for now)
  blockNumber?: number
  transactionHash?: string
}

/**
 * Player statistics
 * Aggregated from drop history
 */
export interface PlinkoPlayerStats {
  totalDrops: number
  totalWagered: number
  totalWon: number
  netProfit: number // totalWon - totalWagered
  biggestWin: number
  biggestMultiplier: number
  winRate: number // Percentage of profitable drops (multiplier > 1)

  // By risk level
  dropsByRisk: {
    GREEN: number
    YELLOW: number
    RED: number
  }
  profitByRisk: {
    GREEN: number
    YELLOW: number
    RED: number
  }

  // Recent performance
  last10Drops: PlinkoDrop[]
  recentWinRate: number // Win rate of last 10 drops
}

/**
 * History filter options
 */
export interface PlinkoHistoryFilter {
  riskLevel?: RiskLevel | 'ALL'
  dateFrom?: number
  dateTo?: number
  minWager?: number
  maxWager?: number
  onlyWins?: boolean
  onlyLosses?: boolean
}

/**
 * Storage adapter interface
 * This abstraction allows easy migration from localStorage to blockchain
 */
export interface IPlinkoStorage {
  /**
   * Save a single drop to storage
   */
  saveDrop(drop: PlinkoDrop): Promise<void>

  /**
   * Get all drops for a player
   */
  getPlayerDrops(player: string, filter?: PlinkoHistoryFilter): Promise<PlinkoDrop[]>

  /**
   * Get player statistics
   */
  getPlayerStats(player: string): Promise<PlinkoPlayerStats>

  /**
   * Clear all history for a player (useful for testing)
   */
  clearPlayerHistory(player: string): Promise<void>

  /**
   * Export history as CSV
   */
  exportToCSV(player: string): Promise<string>
}

/**
 * Storage key format for localStorage
 */
export const PLINKO_STORAGE_KEY = 'plinko-history'

/**
 * Session storage key for anonymous players
 */
export const PLINKO_SESSION_KEY = 'plinko-session'
