# PLINKO V5 - Variable Wagers

## 🎉 Deployed!

**Contract:** `0x8b99B6169A9051cd79Ad6552a2EC952500e17D6D`
**Block:** 25,429,572
**Funding:** 100,000 MORBIUS ✅
**Status:** Ready for frontend integration

---

## 🔥 What Changed

### Before (V4):
- Fixed price: 100 MORBIUS per ball
- Users bought balls, then dropped them separately
- Functions: `buyBalls()`, `dropBall()`, `dropMultipleBalls()`

### After (V5):
- **Variable wager:** 10 - 10,000 MORBIUS per ball (user chooses)
- Everything in one transaction (buy + drop)
- Functions: `buyBallsAndDrop(count, wagerPerBall, riskLevel)`

---

## 📝 Contract Changes

### Constructor
```solidity
// OLD
constructor(..., uint256 _initialBallPrice)

// NEW
constructor(..., uint256 _minWager, uint256 _maxWager)
```

### Main Function
```solidity
// NEW SIGNATURE
function buyBallsAndDrop(
    uint256 count,          // Number of balls
    uint256 wagerPerBall,   // ⭐ NEW: 10-10,000 MORBIUS
    uint8 riskLevel         // 0=LOW, 1=MEDIUM, 2=HIGH
) external

// Example: Buy 10 balls @ 1,000 MORBIUS each with YELLOW risk
buyBallsAndDrop(10, 1000e18, 1)
```

### PLS Purchase
```solidity
// NEW SIGNATURE
function buyBallsWithPLSAndDrop(
    uint256 ballCount,
    uint256 wagerPerBall,   // ⭐ NEW
    uint8 riskLevel
) external payable
```

### Admin Functions
```solidity
// NEW
function setMinWager(uint256 newMin) external onlyOwner
function setMaxWager(uint256 newMax) external onlyOwner

// REMOVED
function setBallPrice(uint256) // No longer exists
```

### View Functions
```solidity
// NEW
function getWagerLimits() external view returns (uint256 min, uint256 max)

// CHANGED
function calculatePayout(
    uint256 wagerAmount,  // ⭐ NEW parameter
    uint8 bucketIndex,
    uint8 riskLevel
) external view returns (uint256)
```

---

## 🚨 BREAKING CHANGES - Frontend Must Update

### 1. Buy Modal UI

**Add Wager Input:**
```tsx
<div>
  <label>Wager Per Ball</label>
  <input
    type="number"
    min={10}
    max={10000}
    defaultValue={1000}
    onChange={(e) => setWagerPerBall(Number(e.target.value))}
  />
  <span>{wagerPerBall.toLocaleString()} MORBIUS</span>
</div>
```

**Update Total Calculation:**
```tsx
// OLD
const totalCost = ballCount * 100; // Fixed 100 MORBIUS

// NEW
const totalCost = ballCount * wagerPerBall; // Variable
```

### 2. Contract Calls

**File:** `/app/PLINKO/page.tsx`

```typescript
// OLD (V4 - BROKEN)
const buyBalls = async (count: number, useNativePLS: boolean) => {
    const txHash = await writeContractAsync({
        functionName: 'buyBallsAndDrop',
        args: [BigInt(count), Number(riskLevel)], // ❌ Missing wagerPerBall
    });
}

// NEW (V5 - CORRECT)
const buyBalls = async (count: number, wagerPerBall: number, useNativePLS: boolean) => {
    const txHash = await writeContractAsync({
        functionName: 'buyBallsAndDrop',
        args: [
            BigInt(count),
            parseEther(wagerPerBall.toString()), // ⭐ Add this
            Number(riskLevel)
        ],
    });
}
```

### 3. Validation

```typescript
const validateWager = (amount: number) => {
    if (amount < 10) {
        alert('Minimum wager: 10 MORBIUS');
        return false;
    }
    if (amount > 10000) {
        alert('Maximum wager: 10,000 MORBIUS');
        return false;
    }
    return true;
};
```

### 4. Approval Amount

```typescript
// OLD
const totalCost = ballPriceData.data * BigInt(buyBallsCount);

// NEW
const totalCost = parseEther(wagerPerBall.toString()) * BigInt(buyBallsCount);
```

### 5. PLS Quote Calculation

```typescript
// OLD
const morbiusNeeded = ballCount * ballPriceData.data;

// NEW
const morbiusNeeded = ballCount * parseEther(wagerPerBall.toString());
```

---

## 🧪 Testing Steps

### 1. Min/Max Validation
```bash
# Should FAIL
Buy 1 ball @ 9 MORBIUS → "InvalidWagerAmount"

# Should WORK
Buy 1 ball @ 10 MORBIUS → ✅

# Should WORK
Buy 1 ball @ 10,000 MORBIUS → ✅

# Should FAIL
Buy 1 ball @ 10,001 MORBIUS → "InvalidWagerAmount"
```

### 2. Variable Payouts
```bash
# Low wager
Buy 1 ball @ 10 MORBIUS, land on 7x → Win 70 MORBIUS

# High wager
Buy 1 ball @ 10,000 MORBIUS, land on 7x → Win 70,000 MORBIUS

# Loss test
Buy 1 ball @ 1,000 MORBIUS, land on 0x (HIGH risk) → Win 0 MORBIUS
```

### 3. Large Bet Protection
```bash
# Test contract reserve
Buy 100 balls @ 10,000 MORBIUS each = 1,000,000 total
If lands on 35x → Needs 35,000,000 MORBIUS payout!
Contract only has 100,000 → WILL FAIL! ❌

# This is why we need max bet protection (see checklist)
```

---

## 📋 Frontend TODO List

**Priority 1 (CRITICAL):**
- [ ] Add wager input to buy modal (default: 1,000)
- [ ] Update `buyBalls()` function signature
- [ ] Pass `wagerPerBall` to contract calls
- [ ] Update total cost calculation
- [ ] Add min/max validation (10-10,000)
- [ ] Update approval amount calculation
- [ ] Update PLS quote calculation

**Priority 2 (RECOMMENDED):**
- [ ] Add wager presets (100, 500, 1000, 5000, 10000)
- [ ] Show potential winnings for each risk level
- [ ] Add warning for large wagers (> 5000)
- [ ] Show max possible win vs contract reserve
- [ ] Add "Max" button (sets to 10,000)

**Priority 3 (NICE TO HAVE):**
- [ ] Remember last wager amount (localStorage)
- [ ] Show wager in USD equivalent
- [ ] Add slider for wager amount
- [ ] Show risk/reward chart for current wager

---

## 🎨 UI Mockup

```
┌─────────────────────────────────┐
│   BUY BALLS & DROP              │
├─────────────────────────────────┤
│                                 │
│   Risk Level                    │
│   [🟢 LOW] [🔵 MEDIUM] [🔴 HIGH]│
│                                 │
│   Number of Balls               │
│   [__10__] balls                │
│   [10] [50] [100]               │
│                                 │
│   Wager Per Ball ⭐ NEW!        │
│   [__1,000__] MORBIUS           │
│   [100] [500] [1K] [5K] [MAX]   │
│   Min: 10  |  Max: 10,000       │
│                                 │
│   ┌───────────────────────────┐ │
│   │ TOTAL COST                │ │
│   │   10,000 MORBIUS          │ │
│   │   (10 balls × 1,000)      │ │
│   └───────────────────────────┘ │
│                                 │
│   Potential Winnings (MEDIUM):  │
│   Min: 2,000 (0.2x)            │
│   Max: 150,000 (15x)           │
│                                 │
│   [Cancel] [Buy & Drop 🎰]     │
└─────────────────────────────────┘
```

---

## ⚙️ Configuration

**Current Settings:**
- Min Wager: 10 MORBIUS
- Max Wager: 10,000 MORBIUS
- Default: 1,000 MORBIUS (recommended)

**To Change (Owner Only):**
```bash
# Increase max to 50,000
cast send $PLINKO_ADDRESS "setMaxWager(uint256)" 50000000000000000000000 \
  --private-key $PRIVATE_KEY

# Lower min to 1
cast send $PLINKO_ADDRESS "setMinWager(uint256)" 1000000000000000000 \
  --private-key $PRIVATE_KEY
```

---

## 🚀 Deployment Info

**Mainnet:**
- Address: `0x8b99B6169A9051cd79Ad6552a2EC952500e17D6D`
- Block: 25,429,572
- Network: PulseChain
- Funded: 100,000 MORBIUS

**Verification Command:**
```bash
npx hardhat verify --network pulsechain \
  0x8b99B6169A9051cd79Ad6552a2EC952500e17D6D \
  "0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1" \
  "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" \
  "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02" \
  "0x70444750eedF1B2c9b777cbF096a5919A14895e5" \
  "10000000000000000000" \
  "10000000000000000000000"
```

---

## 📊 Comparison Table

| Feature | V4 (Fixed Price) | V5 (Variable Wager) |
|---------|------------------|---------------------|
| **Wager** | 100 MORBIUS (fixed) | 10-10,000 MORBIUS (user choice) |
| **Min Bet** | 100 MORBIUS | 10 MORBIUS |
| **Max Bet** | 100 MORBIUS | 10,000 MORBIUS |
| **Buy & Drop** | Separate functions | One function |
| **Ball Balance** | Tracked | Not tracked |
| **Functions** | 6 (buy, drop, etc) | 2 (buyAndDrop only) |
| **Complexity** | Higher | Lower |
| **Flexibility** | Low | High |
| **Gas Cost** | Similar | Similar |

---

## 🎯 Key Benefits

1. **User Choice:** Players control their risk/reward
2. **Simpler:** One transaction instead of two
3. **Flexible:** High rollers and small bettors both happy
4. **Cleaner Code:** Removed unused ball balance logic

---

## ⚠️ Important Notes

1. **Frontend MUST be updated** before deploying to users
2. **Test thoroughly** with small amounts first
3. **Consider max bet protection** (see production checklist)
4. **Monitor contract reserve** - can be drained faster with high wagers
5. **ABI regeneration required** - old ABI won't work

---

## 📞 Next Steps

1. ✅ Contract deployed and funded
2. ⚠️ **Update frontend** (see TODO list above)
3. ⚠️ Test with real funds (start small)
4. ⚠️ Verify contract on explorer
5. ⚠️ Review production checklist
6. 🚀 Launch!

**See: `/docs/PRODUCTION_READINESS_CHECKLIST.md` for full launch guide**
