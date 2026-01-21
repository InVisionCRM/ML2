import { useRef } from 'react'
import { useBalance } from 'wagmi'
import { formatEther } from 'viem'

/**
 * Hook to get native PLS balance for connected wallet
 */
export function useNativeBalance(address?: `0x${string}`) {
  const { data, error, isLoading, refetch } = useBalance({
    address,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refetch every 10 seconds
      retry: 3, // Retry failed requests
    },
  })

  // Track previous balance to only log on changes
  const prevBalanceRef = useRef<bigint | undefined>(undefined)

  // Debug logging for troubleshooting
  if (address && error) {
    console.error('Error fetching PLS balance:', error)
    console.log('Wallet address:', address)
    console.log('Error details:', {
      message: error.message,
      cause: error.cause,
      name: error.name,
    })
  }

  // Only log when balance actually changes
  if (address && data && data.value !== prevBalanceRef.current) {
    console.log('PLS Balance loaded:', data.formatted, data.symbol)
    prevBalanceRef.current = data.value
  }

  return {
    balance: data?.value || BigInt(0),
    balanceFormatted: data?.formatted || '0',
    symbol: data?.symbol || 'PLS',
    decimals: data?.decimals || 18,
    isLoading,
    error,
    refetch,
  }
}

