import { formatUnits } from 'viem'

/**
 * Format MORBIUS token amounts as whole numbers
 * @param value - BigInt value in wei (18 decimals)
 * @param showDecimals - If true, shows decimals; otherwise shows whole numbers only
 * @returns Formatted string (e.g., "100" or "1,234,567")
 */
export function formatMORBIUS(value: bigint, showDecimals = false): string {
  const formatted = formatUnits(value, 18)

  if (showDecimals) {
    return parseFloat(formatted).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })
  }

  // Return whole number with thousands separators
  return Math.floor(parseFloat(formatted)).toLocaleString()
}

/**
 * Format PLS amounts with 4 decimal places
 * @param value - BigInt value in wei (18 decimals)
 * @returns Formatted string (e.g., "123.4567")
 */
export function formatPLS(value: bigint): string {
  const formatted = formatUnits(value, 18)
  return parseFloat(formatted).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  })
}

/**
 * Format compact numbers (K, M, B)
 * @param num - Number to format
 * @returns Formatted string (e.g., "1.2M", "500K")
 */
export function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
  return num.toFixed(0)
}
