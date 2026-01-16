# PLINKO Buy Flow Fixes

## Issues Fixed

### 1. ❌ **Missing Token Approval for MORBIUS Purchases**
**Problem:**
- When buying with MORBIUS, the contract calls `transferFrom()` to take tokens from the user
- Users need to approve the PLINKO contract to spend their MORBIUS first
- No approval flow was implemented, causing transactions to fail

**Solution:**
- Added `useTokenApproval` hook integration
- Shows "Approve MORBIUS" button when needed
- Prevents buy button from working until approval is granted
- Shows loading states during approval process

### 2. ❌ **PLS Price Calculation Issues**
**Problem:**
- Price loading states weren't shown
- No error handling if price fetch failed
- Users saw "undefined" or NaN values

**Solution:**
- Added loading states: "Loading price..."
- Added error messages if price unavailable
- Suggests using MORBIUS if PLS price fails
- Better number formatting with proper decimals

### 3. ❌ **Poor Error Messages**
**Problem:**
- Generic "error about USD PRICE" messages
- No guidance on what to do
- Users confused about what went wrong

**Solution:**
- Specific error messages for each failure type
- User-friendly alerts
- Console logging for debugging
- Clear instructions (e.g., "Please approve MORBIUS spending first")

## New Buy Flow

### MORBIUS Purchase Flow:
1. User clicks colored button (GREEN/YELLOW/RED) to select risk
2. Buy modal opens
3. User selects MORBIUS payment method
4. User selects number of balls (1-100)
5. **IF APPROVAL NEEDED:**
   - Yellow info box appears
   - User clicks "Approve MORBIUS" button
   - Wallet prompts for approval transaction
   - Wait for approval confirmation
   - Info box disappears
6. User clicks "Buy & Drop with MORBIUS"
7. Wallet prompts for transaction
8. Transaction executes `buyBallsAndDrop(count, riskLevel)`
9. Contract generates RNG, pays out, emits events
10. Frontend receives `BallDropped` events
11. Balls drop one by one with animations! 🎉

### PLS Purchase Flow:
1. User clicks colored button to select risk
2. Buy modal opens
3. User selects PLS payment method
4. System fetches WPLS/MORBIUS price from PulseX
5. **IF PRICE LOADING:** Shows "Loading price..."
6. **IF PRICE ERROR:** Shows error message, suggests MORBIUS
7. Calculates PLS cost with 50% buffer for slippage
8. Shows estimated PLS amount needed
9. User clicks "Buy & Drop with PLS"
10. Wallet prompts for transaction (with PLS value)
11. Transaction executes `buyBallsWithPLSAndDrop(count, riskLevel)`
12. Contract swaps PLS → WPLS → MORBIUS, drops balls
13. Frontend receives `BallDropped` events
14. Balls drop with animations! 🎉

## Code Changes

### File: `app/PLINKO/page.tsx`

#### Added Imports (Line 17):
```typescript
import { useTokenApproval } from '@/hooks/use-token-approval';
```

#### Added Price Loading States (Line 161):
```typescript
const { wplsPerMORBIUS, isLoading: isLoadingPrice, error: priceError } = useWplsPrice();
```

#### Added Token Approval Hook (Lines 170-187):
```typescript
// Calculate total MORBIUS cost for approval
const totalMorbiusCost = ballPriceData.data
  ? ballPriceData.data * BigInt(buyBallsCount)
  : BigInt(0);

// Token approval for MORBIUS purchases
const {
  needsApproval,
  approve,
  isApproving,
  isLoadingAllowance,
} = useTokenApproval({
  tokenAddress: MORBIUS_TOKEN_ADDRESS as `0x${string}`,
  spenderAddress: PLINKO_ADDRESS as `0x${string}`,
  requiredAmount: totalMorbiusCost,
  userAddress: address,
  enabled: !usePLS && showBuyBallsModal,
});
```

#### Enhanced Buy Function (Lines 393-499):
- Added approval check for MORBIUS purchases
- Added price validation for PLS purchases
- Better error handling with specific messages
- Better console logging for debugging

#### Enhanced Buy Modal UI (Lines 1188-1266):
- Shows loading states for price
- Shows approval section when needed
- Shows error messages clearly
- Better decimal formatting
- Disables buy button until approved

## Testing Instructions

### Test MORBIUS Purchase (First Time):

1. Navigate to `/PLINKO`
2. Disable Free Play mode
3. Connect wallet with MORBIUS tokens
4. Click GREEN/YELLOW/RED button
5. Select MORBIUS payment
6. Set balls to 1 (for testing)
7. **EXPECTED:** Yellow box appears saying "First, approve PLINKO contract"
8. Click "Approve MORBIUS"
9. Confirm approval in wallet
10. Wait for confirmation
11. **EXPECTED:** Yellow box disappears, "Buy & Drop" button becomes active
12. Click "Buy & Drop with MORBIUS"
13. Confirm transaction
14. **EXPECTED:** Ball drops and animates with result!

### Test MORBIUS Purchase (Subsequent):

1. Click GREEN/YELLOW/RED again
2. Select MORBIUS payment
3. **EXPECTED:** No approval box (already approved)
4. "Buy & Drop" button is immediately active
5. Click and confirm
6. Ball drops!

### Test PLS Purchase:

1. Click GREEN/YELLOW/RED button
2. Select PLS payment
3. **EXPECTED:** Shows "~X.XXXX PLS (w/ 50% buffer)"
4. If price loading: Shows "Loading price..."
5. If price error: Shows warning message
6. Click "Buy & Drop with PLS"
7. Confirm transaction with PLS value
8. Ball drops!

### Common Issues and Solutions:

**"Approve First" button won't work:**
- ✅ Check you have MORBIUS in your wallet
- ✅ Check wallet is connected
- ✅ Check you're on PulseChain network
- ✅ Try refreshing the page

**PLS price shows "...":**
- ✅ Wait a few seconds for price to load
- ✅ Check PulseX liquidity pool is active
- ✅ Try using MORBIUS instead

**Transaction fails:**
- ✅ Check you have enough MORBIUS/PLS
- ✅ Check contract has enough reserve for payouts
- ✅ Check gas settings
- ✅ Check network connection

**No animations after transaction:**
- ✅ Check browser console for "BallDropped event received"
- ✅ Check transaction on block explorer for events
- ✅ Verify PLINKO_ADDRESS is correct in `/lib/contracts.ts`
- ✅ Wait up to 30 seconds for events to propagate

## Summary

| Issue | Before | After |
|-------|--------|-------|
| Token Approval | ❌ Not implemented | ✅ Full approval flow |
| PLS Price | ❌ No loading states | ✅ Shows loading/errors |
| Error Messages | ❌ Generic "USD PRICE" | ✅ Specific, helpful |
| Buy Button | ❌ Active when shouldn't be | ✅ Properly disabled |
| User Experience | ❌ Confusing failures | ✅ Clear guidance |

Your PLINKO game now has a complete, user-friendly buy flow! 🎉
