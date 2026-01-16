import { useMemo } from 'react'
import { useReadContract } from 'wagmi'
import type { Address } from 'viem'
import {
  PULSEX_V1_ROUTER_ADDRESS,
  WPLS_TOKEN_ADDRESS,
  MORBIUS_TOKEN_ADDRESS,
} from '@/lib/contracts'

const ROUTER_ABI = [
  {
    name: 'getAmountsIn',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'amountOut', type: 'uint256' },
      { name: 'path', type: 'address[]' },
    ],
    outputs: [{ name: 'amounts', type: 'uint256[]' }],
  },
] as const

interface UsePlsQuoteParams {
  morbiusCost: bigint
  enabled?: boolean
}

interface UsePlsQuoteReturn {
  plsValue: bigint
  basePlsQuote: bigint
  isLoading: boolean
  error: Error | null
  hasQuote: boolean
  usingFallback: boolean
}

// Tax and slippage constants
const TAX_MULTIPLIER = BigInt(15000) // 50% tax: 1.5x
const TAX_DIVISOR = BigInt(10000)
const SLIPPAGE_MULTIPLIER = BigInt(12000) // 20% buffer: 1.2x
const SLIPPAGE_DIVISOR = BigInt(10000)

// Fallback: Approximate WPLS/MORBIUS ratio based on pool reserves
// Pool: 124M WPLS / 306M MORBIUS = 1 WPLS ≈ 2.47 MORBIUS
// Inverted: 1 MORBIUS ≈ 0.405 WPLS
const FALLBACK_WPLS_PER_MORBIUS = BigInt(2)

export function usePlsQuote({
  morbiusCost,
  enabled = true,
}: UsePlsQuoteParams): UsePlsQuoteReturn {
  // Query PulseX router for current exchange rate
  const {
    data: plsBaseQuote,
    error: plsQuoteError,
    isLoading: isLoadingPlsQuote,
  } = useReadContract({
    address: PULSEX_V1_ROUTER_ADDRESS as Address,
    abi: ROUTER_ABI,
    functionName: 'getAmountsIn',
    args: enabled && morbiusCost > BigInt(0)
      ? [morbiusCost, [WPLS_TOKEN_ADDRESS as Address, MORBIUS_TOKEN_ADDRESS as Address]]
      : undefined,
    query: {
      enabled: enabled && morbiusCost > BigInt(0),
      refetchInterval: 10000, // Refresh every 10 seconds
      retry: 3,
      retryDelay: 1000,
    },
  })

  const result = useMemo(() => {
    let basePlsCost = BigInt(0)
    let usingFallback = false

    // Try to get quote from DEX
    if (plsBaseQuote && Array.isArray(plsBaseQuote) && plsBaseQuote[0]) {
      basePlsCost = plsBaseQuote[0]
    }
    // Fallback: Use estimated rate if DEX query fails or returns zero
    else if (morbiusCost > BigInt(0)) {
      basePlsCost = morbiusCost / FALLBACK_WPLS_PER_MORBIUS
      usingFallback = true

      console.log('⚠️ Using fallback PLS pricing:', {
        morbiusCost: morbiusCost.toString(),
        fallbackQuote: basePlsCost.toString(),
        error: plsQuoteError?.message,
      })
    }

    // Return zero if no cost
    if (basePlsCost === BigInt(0)) {
      return {
        plsValue: BigInt(0),
        basePlsQuote: BigInt(0),
        isLoading: isLoadingPlsQuote,
        error: plsQuoteError as Error | null,
        hasQuote: false,
        usingFallback: false,
      }
    }

    // Apply 50% tax (making PLS payments 50% more expensive)
    const taxedAmount = (basePlsCost * TAX_MULTIPLIER) / TAX_DIVISOR

    // Add 20% buffer for slippage and DEX fees
    const totalPlsRequired = (taxedAmount * SLIPPAGE_MULTIPLIER) / SLIPPAGE_DIVISOR

    // FORCE console output - cannot be filtered
    const debugInfo = {
      morbiusCost: morbiusCost.toString(),
      basePlsCost: basePlsCost.toString(),
      taxedAmount: taxedAmount.toString(),
      finalPls: totalPlsRequired.toString(),
      usingFallback,
    }
    console.warn('💰 PLS QUOTE CALCULATION:', debugInfo)
    console.table(debugInfo)

    return {
      plsValue: totalPlsRequired,
      basePlsQuote: basePlsCost,
      isLoading: isLoadingPlsQuote,
      error: plsQuoteError as Error | null,
      hasQuote: true,
      usingFallback,
    }
  }, [plsBaseQuote, morbiusCost, plsQuoteError, isLoadingPlsQuote])

  return result
}
