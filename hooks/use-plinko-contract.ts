import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { PLINKO_ABI } from '@/abi/plinko'
import { PLINKO_ADDRESS, MORBIUS_TOKEN_ADDRESS } from '@/lib/contracts'
import { useAccount } from 'wagmi'

// ============ Read Hooks ============

/**
 * Get wager limits (min and max MORBIUS per ball) - V5
 */
export function useWagerLimits() {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getWagerLimits',
    query: {
      enabled: isValidAddress,
      refetchInterval: 30000, // Refetch every 30 seconds
    },
  })
}

/**
 * @deprecated Use useWagerLimits() instead - V5 removed fixed ball price
 */
export function useBallPrice() {
  console.warn('useBallPrice() is deprecated. Use useWagerLimits() instead for V5.')
  return useWagerLimits()
}

/**
 * Get bucket multipliers for a specific risk level
 * @param riskLevel 0=LOW, 1=MEDIUM, 2=HIGH
 */
export function useBucketMultipliers(riskLevel: number = 1) {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getBucketMultipliers',
    args: [riskLevel] as [number],
    query: {
      enabled: isValidAddress,
    },
  })
}

/**
 * Get LOW risk multipliers
 */
export function useLowRiskMultipliers() {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getLowRiskMultipliers',
    query: {
      enabled: isValidAddress,
    },
  })
}

/**
 * Get MEDIUM risk multipliers
 */
export function useMediumRiskMultipliers() {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getMediumRiskMultipliers',
    query: {
      enabled: isValidAddress,
    },
  })
}

/**
 * Get HIGH risk multipliers
 */
export function useHighRiskMultipliers() {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getHighRiskMultipliers',
    query: {
      enabled: isValidAddress,
    },
  })
}

/**
 * Get contract payout reserve balance
 */
export function useContractReserve() {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getContractReserve',
    query: {
      enabled: isValidAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    },
  })
}

/**
 * Get player information (ball balance, stats, etc.)
 */
export function usePlayerInfo(playerAddress?: `0x${string}`) {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getPlayerInfo',
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: isValidAddress && !!playerAddress,
      refetchInterval: 5000, // Refetch every 5 seconds for real-time ball balance
    },
  })
}

/**
 * Get player ball balance (quick access)
 */
export function usePlayerBallBalance(playerAddress?: `0x${string}`) {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getPlayerBallBalance',
    args: playerAddress ? [playerAddress] : undefined,
    query: {
      enabled: isValidAddress && !!playerAddress,
      refetchInterval: 5000,
    },
  })
}

/**
 * Get global game statistics
 */
export function useGlobalStats() {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'getGlobalStats',
    query: {
      enabled: isValidAddress,
      refetchInterval: 15000, // Refetch every 15 seconds
    },
  })
}

/**
 * Calculate expected payout for a specific bucket with wager amount - V5
 * @param wagerAmount Wager amount in wei
 * @param bucketIndex Bucket index (0-16, 0-indexed)
 * @param riskLevel Risk level (0=LOW, 1=MEDIUM, 2=HIGH)
 */
export function useCalculatePayout(wagerAmount: bigint, bucketIndex: number, riskLevel: number) {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  return useReadContract({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    functionName: 'calculatePayout',
    args: [wagerAmount, bucketIndex, riskLevel] as [bigint, number, number],
    query: {
      enabled: isValidAddress && bucketIndex >= 0 && bucketIndex <= 16,
    },
  })
}

// ============ Write Hooks ============

/**
 * Hook for all write operations (buy balls, drop ball, etc.)
 */
export function usePlinkoWrite() {
  return useWriteContract()
}

// ============ Event Watchers ============

/**
 * Watch for BallsPurchased events
 */
export function useWatchBallsPurchased(onEvent: (event: any) => void) {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  useWatchContractEvent({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    eventName: 'BallsPurchased',
    onLogs(logs) {
      logs.forEach((log) => onEvent(log))
    },
    enabled: isValidAddress,
  })
}

/**
 * Watch for BallDropped events
 */
export function useWatchBallDropped(onEvent: (event: any) => void) {
  const isValidAddress = (PLINKO_ADDRESS as string) !== '0x0000000000000000000000000000000000000000'
  useWatchContractEvent({
    address: PLINKO_ADDRESS,
    abi: PLINKO_ABI,
    eventName: 'BallDropped',
    onLogs(logs) {
      logs.forEach((log) => onEvent(log))
    },
    enabled: isValidAddress,
  })
}

// ============ Helper Hooks ============

/**
 * Combined hook for player data (includes connected wallet check)
 */
export function usePlayerData() {
  const { address } = useAccount()
  const playerInfo = usePlayerInfo(address)
  const ballBalance = usePlayerBallBalance(address)

  return {
    address,
    isConnected: !!address,
    playerInfo,
    ballBalance,
  }
}

/**
 * Combined hook for game configuration - V5
 */
export function useGameConfig() {
  const wagerLimits = useWagerLimits()
  const multipliers = useBucketMultipliers()
  const reserve = useContractReserve()
  const globalStats = useGlobalStats()

  return {
    wagerLimits,
    multipliers,
    reserve,
    globalStats,
  }
}
