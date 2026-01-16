/**
 * PLINKO Storage Adapters
 *
 * LocalStorage Implementation (Current)
 * Blockchain Implementation (Future - when contract is deployed)
 */

import {
  IPlinkoStorage,
  PlinkoDrop,
  PlinkoPlayerStats,
  PlinkoHistoryFilter,
  PLINKO_STORAGE_KEY,
  PLINKO_SESSION_KEY,
} from './plinko-types'

/**
 * LocalStorage Implementation
 * Stores player history in browser localStorage, organized by wallet address
 */
export class LocalStoragePlinkoAdapter implements IPlinkoStorage {
  private getStorageData(): Record<string, PlinkoDrop[]> {
    if (typeof window === 'undefined') return {}

    try {
      const data = localStorage.getItem(PLINKO_STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Failed to parse PLINKO history from localStorage:', error)
      return {}
    }
  }

  private setStorageData(data: Record<string, PlinkoDrop[]>): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(PLINKO_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save PLINKO history to localStorage:', error)
    }
  }

  async saveDrop(drop: PlinkoDrop): Promise<void> {
    const allData = this.getStorageData()
    const playerKey = drop.player.toLowerCase()

    if (!allData[playerKey]) {
      allData[playerKey] = []
    }

    // Add drop to beginning (most recent first)
    allData[playerKey].unshift(drop)

    // Keep only last 1000 drops per player to prevent localStorage bloat
    if (allData[playerKey].length > 1000) {
      allData[playerKey] = allData[playerKey].slice(0, 1000)
    }

    this.setStorageData(allData)
  }

  async getPlayerDrops(
    player: string,
    filter?: PlinkoHistoryFilter
  ): Promise<PlinkoDrop[]> {
    const allData = this.getStorageData()
    const playerKey = player.toLowerCase()
    let drops = allData[playerKey] || []

    // Apply filters
    if (filter) {
      drops = drops.filter((drop) => {
        // Risk level filter
        if (filter.riskLevel && filter.riskLevel !== 'ALL' && drop.riskLevel !== filter.riskLevel) {
          return false
        }

        // Date range filter
        if (filter.dateFrom && drop.timestamp < filter.dateFrom) {
          return false
        }
        if (filter.dateTo && drop.timestamp > filter.dateTo) {
          return false
        }

        // Wager range filter
        if (filter.minWager && drop.wager < filter.minWager) {
          return false
        }
        if (filter.maxWager && drop.wager > filter.maxWager) {
          return false
        }

        // Win/loss filter
        if (filter.onlyWins && drop.profit <= 0) {
          return false
        }
        if (filter.onlyLosses && drop.profit >= 0) {
          return false
        }

        return true
      })
    }

    return drops
  }

  async getPlayerStats(player: string): Promise<PlinkoPlayerStats> {
    const drops = await this.getPlayerDrops(player)

    if (drops.length === 0) {
      return {
        totalDrops: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        biggestWin: 0,
        biggestMultiplier: 0,
        winRate: 0,
        dropsByRisk: { GREEN: 0, YELLOW: 0, RED: 0 },
        profitByRisk: { GREEN: 0, YELLOW: 0, RED: 0 },
        last10Drops: [],
        recentWinRate: 0,
      }
    }

    // Calculate stats
    const totalDrops = drops.length
    const totalWagered = drops.reduce((sum, d) => sum + d.wager, 0)
    const totalWon = drops.reduce((sum, d) => sum + d.winAmount, 0)
    const netProfit = totalWon - totalWagered

    const biggestWin = Math.max(...drops.map((d) => d.winAmount))
    const biggestMultiplier = Math.max(...drops.map((d) => d.multiplier))

    const winCount = drops.filter((d) => d.multiplier > 1).length
    const winRate = (winCount / totalDrops) * 100

    // Stats by risk level
    const dropsByRisk = {
      GREEN: drops.filter((d) => d.riskLevel === 'GREEN').length,
      YELLOW: drops.filter((d) => d.riskLevel === 'YELLOW').length,
      RED: drops.filter((d) => d.riskLevel === 'RED').length,
    }

    const profitByRisk = {
      GREEN: drops
        .filter((d) => d.riskLevel === 'GREEN')
        .reduce((sum, d) => sum + d.profit, 0),
      YELLOW: drops
        .filter((d) => d.riskLevel === 'YELLOW')
        .reduce((sum, d) => sum + d.profit, 0),
      RED: drops
        .filter((d) => d.riskLevel === 'RED')
        .reduce((sum, d) => sum + d.profit, 0),
    }

    // Recent performance (last 10 drops)
    const last10Drops = drops.slice(0, 10)
    const recentWinCount = last10Drops.filter((d) => d.multiplier > 1).length
    const recentWinRate = last10Drops.length > 0 ? (recentWinCount / last10Drops.length) * 100 : 0

    return {
      totalDrops,
      totalWagered,
      totalWon,
      netProfit,
      biggestWin,
      biggestMultiplier,
      winRate,
      dropsByRisk,
      profitByRisk,
      last10Drops,
      recentWinRate,
    }
  }

  async clearPlayerHistory(player: string): Promise<void> {
    const allData = this.getStorageData()
    const playerKey = player.toLowerCase()
    delete allData[playerKey]
    this.setStorageData(allData)
  }

  async exportToCSV(player: string): Promise<string> {
    const drops = await this.getPlayerDrops(player)

    // CSV header
    const headers = [
      'Timestamp',
      'Date',
      'Wager',
      'Multiplier',
      'Win Amount',
      'Profit',
      'Risk Level',
      'Bucket Index',
    ]

    // CSV rows
    const rows = drops.map((drop) => [
      drop.timestamp,
      new Date(drop.timestamp).toISOString(),
      drop.wager.toFixed(2),
      drop.multiplier.toString(),
      drop.winAmount.toFixed(2),
      drop.profit.toFixed(2),
      drop.riskLevel,
      drop.bucketIndex,
    ])

    // Combine into CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    return csvContent
  }
}

/**
 * Session Storage Implementation
 * For anonymous players (not connected wallet)
 * Data is lost when browser tab closes
 */
export class SessionStoragePlinkoAdapter implements IPlinkoStorage {
  private readonly SESSION_PLAYER = 'anonymous'

  private getStorageData(): PlinkoDrop[] {
    if (typeof window === 'undefined') return []

    try {
      const data = sessionStorage.getItem(PLINKO_SESSION_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to parse PLINKO session history:', error)
      return []
    }
  }

  private setStorageData(data: PlinkoDrop[]): void {
    if (typeof window === 'undefined') return

    try {
      sessionStorage.setItem(PLINKO_SESSION_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save PLINKO session history:', error)
    }
  }

  async saveDrop(drop: PlinkoDrop): Promise<void> {
    const drops = this.getStorageData()
    drops.unshift(drop)

    // Keep only last 100 drops in session
    if (drops.length > 100) {
      drops.splice(100)
    }

    this.setStorageData(drops)
  }

  async getPlayerDrops(
    player: string,
    filter?: PlinkoHistoryFilter
  ): Promise<PlinkoDrop[]> {
    let drops = this.getStorageData()

    // Apply same filters as localStorage adapter
    if (filter) {
      drops = drops.filter((drop) => {
        if (filter.riskLevel && filter.riskLevel !== 'ALL' && drop.riskLevel !== filter.riskLevel) {
          return false
        }
        if (filter.dateFrom && drop.timestamp < filter.dateFrom) {
          return false
        }
        if (filter.dateTo && drop.timestamp > filter.dateTo) {
          return false
        }
        if (filter.minWager && drop.wager < filter.minWager) {
          return false
        }
        if (filter.maxWager && drop.wager > filter.maxWager) {
          return false
        }
        if (filter.onlyWins && drop.profit <= 0) {
          return false
        }
        if (filter.onlyLosses && drop.profit >= 0) {
          return false
        }
        return true
      })
    }

    return drops
  }

  async getPlayerStats(player: string): Promise<PlinkoPlayerStats> {
    const drops = await this.getPlayerDrops(player)

    if (drops.length === 0) {
      return {
        totalDrops: 0,
        totalWagered: 0,
        totalWon: 0,
        netProfit: 0,
        biggestWin: 0,
        biggestMultiplier: 0,
        winRate: 0,
        dropsByRisk: { GREEN: 0, YELLOW: 0, RED: 0 },
        profitByRisk: { GREEN: 0, YELLOW: 0, RED: 0 },
        last10Drops: [],
        recentWinRate: 0,
      }
    }

    const totalDrops = drops.length
    const totalWagered = drops.reduce((sum, d) => sum + d.wager, 0)
    const totalWon = drops.reduce((sum, d) => sum + d.winAmount, 0)
    const netProfit = totalWon - totalWagered

    const biggestWin = Math.max(...drops.map((d) => d.winAmount))
    const biggestMultiplier = Math.max(...drops.map((d) => d.multiplier))

    const winCount = drops.filter((d) => d.multiplier > 1).length
    const winRate = (winCount / totalDrops) * 100

    const dropsByRisk = {
      GREEN: drops.filter((d) => d.riskLevel === 'GREEN').length,
      YELLOW: drops.filter((d) => d.riskLevel === 'YELLOW').length,
      RED: drops.filter((d) => d.riskLevel === 'RED').length,
    }

    const profitByRisk = {
      GREEN: drops
        .filter((d) => d.riskLevel === 'GREEN')
        .reduce((sum, d) => sum + d.profit, 0),
      YELLOW: drops
        .filter((d) => d.riskLevel === 'YELLOW')
        .reduce((sum, d) => sum + d.profit, 0),
      RED: drops
        .filter((d) => d.riskLevel === 'RED')
        .reduce((sum, d) => sum + d.profit, 0),
    }

    const last10Drops = drops.slice(0, 10)
    const recentWinCount = last10Drops.filter((d) => d.multiplier > 1).length
    const recentWinRate = last10Drops.length > 0 ? (recentWinCount / last10Drops.length) * 100 : 0

    return {
      totalDrops,
      totalWagered,
      totalWon,
      netProfit,
      biggestWin,
      biggestMultiplier,
      winRate,
      dropsByRisk,
      profitByRisk,
      last10Drops,
      recentWinRate,
    }
  }

  async clearPlayerHistory(player: string): Promise<void> {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(PLINKO_SESSION_KEY)
    }
  }

  async exportToCSV(player: string): Promise<string> {
    const drops = await this.getPlayerDrops(player)

    const headers = [
      'Timestamp',
      'Date',
      'Wager',
      'Multiplier',
      'Win Amount',
      'Profit',
      'Risk Level',
      'Bucket Index',
    ]

    const rows = drops.map((drop) => [
      drop.timestamp,
      new Date(drop.timestamp).toISOString(),
      drop.wager.toFixed(2),
      drop.multiplier.toString(),
      drop.winAmount.toFixed(2),
      drop.profit.toFixed(2),
      drop.riskLevel,
      drop.bucketIndex,
    ])

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  }
}

// Export singleton instances
export const localStorageAdapter = new LocalStoragePlinkoAdapter()
export const sessionStorageAdapter = new SessionStoragePlinkoAdapter()
