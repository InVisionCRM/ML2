'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAccount } from 'wagmi'
import {
  PlinkoDrop,
  PlinkoPlayerStats,
  PlinkoHistoryFilter,
} from '@/lib/plinko-types'
import {
  localStorageAdapter,
  sessionStorageAdapter,
} from '@/lib/plinko-storage'
import { RiskLevel } from '@/app/PLINKO/types'

/**
 * Hook for managing PLINKO drop history
 *
 * - Uses localStorage for connected wallets (persistent)
 * - Uses sessionStorage for anonymous players (session-only)
 * - Blockchain-ready: Easy migration when contract is deployed
 */
export function usePlinkoHistory() {
  const { address, isConnected } = useAccount()
  const [drops, setDrops] = useState<PlinkoDrop[]>([])
  const [stats, setStats] = useState<PlinkoPlayerStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filter, setFilter] = useState<PlinkoHistoryFilter>({})

  // Choose storage adapter based on wallet connection
  const storage = useMemo(() => {
    return isConnected ? localStorageAdapter : sessionStorageAdapter
  }, [isConnected])

  // Player identifier (wallet address or 'anonymous')
  const playerKey = useMemo(() => {
    return address || 'anonymous'
  }, [address])

  /**
   * Load player history from storage
   */
  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const [playerDrops, playerStats] = await Promise.all([
        storage.getPlayerDrops(playerKey, filter),
        storage.getPlayerStats(playerKey),
      ])

      setDrops(playerDrops)
      setStats(playerStats)
    } catch (error) {
      console.error('Failed to load PLINKO history:', error)
      setDrops([])
      setStats(null)
    } finally {
      setIsLoading(false)
    }
  }, [storage, playerKey, filter])

  /**
   * Record a new drop
   */
  const recordDrop = useCallback(
    async (
      wager: number,
      multiplier: number,
      riskLevel: RiskLevel,
      bucketIndex: number,
      transactionHash?: string
    ) => {
      const winAmount = wager * multiplier
      const profit = winAmount - wager

      const drop: PlinkoDrop = {
        id: transactionHash || `${Date.now()}-${Math.random().toString(36).substring(7)}`, // Use tx hash as ID if available
        timestamp: Date.now(),
        player: playerKey,
        wager,
        multiplier,
        winAmount,
        profit,
        riskLevel,
        bucketIndex,
        transactionHash,
      }

      try {
        await storage.saveDrop(drop)
        // Reload history to update stats
        await loadHistory()
      } catch (error) {
        console.error('Failed to record drop:', error)
      }
    },
    [storage, playerKey, loadHistory]
  )

  /**
   * Update a drop with transaction hash (for when transaction confirms)
   */
  const updateDropTransactionHash = useCallback(
    async (dropId: string, transactionHash: string) => {
      try {
        // Get current drops
        const currentDrops = await storage.getPlayerDrops(playerKey)

        // Find and update the drop
        const updatedDrops = currentDrops.map(drop =>
          drop.id === dropId
            ? { ...drop, id: transactionHash, transactionHash }
            : drop
        )

        // Save updated drops (this is a simplified approach - in a real app you'd have an update method)
        for (const updatedDrop of updatedDrops) {
          if (updatedDrop.id === transactionHash) {
            await storage.saveDrop(updatedDrop)
          }
        }

        // Remove the old drop if it exists
        const oldDrop = currentDrops.find(drop => drop.id === dropId && drop.id !== transactionHash)
        if (oldDrop) {
          // Note: This is a limitation of the current storage interface
          // In a real app, you'd have a proper update/delete mechanism
        }

        await loadHistory()
      } catch (error) {
        console.error('Failed to update drop transaction hash:', error)
      }
    },
    [storage, playerKey, loadHistory]
  )

  /**
   * Clear all history for current player
   */
  const clearHistory = useCallback(async () => {
    try {
      await storage.clearPlayerHistory(playerKey)
      setDrops([])
      setStats(null)
    } catch (error) {
      console.error('Failed to clear history:', error)
    }
  }, [storage, playerKey])

  /**
   * Export history as CSV
   */
  const exportHistory = useCallback(async () => {
    try {
      const csv = await storage.exportToCSV(playerKey)

      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plinko-history-${playerKey}-${Date.now()}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export history:', error)
    }
  }, [storage, playerKey])

  /**
   * Update filter
   */
  const updateFilter = useCallback((newFilter: Partial<PlinkoHistoryFilter>) => {
    setFilter((prev) => ({ ...prev, ...newFilter }))
  }, [])

  /**
   * Clear filter
   */
  const clearFilter = useCallback(() => {
    setFilter({})
  }, [])

  // Load history on mount and when player/filter changes
  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  // Auto-refresh stats when wallet connects/disconnects
  useEffect(() => {
    if (isConnected !== undefined) {
      loadHistory()
    }
  }, [isConnected, loadHistory])

  return {
    // Data
    drops,
    stats,
    filter,
    isLoading,
    playerKey,
    isConnected,

    // Actions
    recordDrop,
    updateDropTransactionHash,
    clearHistory,
    exportHistory,
    updateFilter,
    clearFilter,
    refresh: loadHistory,
  }
}
