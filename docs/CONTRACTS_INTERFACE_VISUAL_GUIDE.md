# Contract Interface - Visual Guide

## Page Layout

```
┌────────────────────────────────────────────────────────────┐
│  HEADER                                                    │
│  [MORBIUS]  [Lottery]  [Keno]  [Contracts]  [Connect]    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  CONTRACT INTERFACE                                        │
│  Interact with SuperStakeLottery6of55V2 and CryptoKeno   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  [Wallet Not Connected Warning - if not connected]        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  [ Lottery 6-of-55 ]  [ Crypto Keno ]                    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  SuperStakeLottery6of55V2                                 │
│  6-of-55 lottery with WPLS payment support...            │
│                                                            │
│  [ User Actions ] [ Admin ] [ Statistics ]                │
│                                                            │
│  [Content based on selected tab]                          │
└────────────────────────────────────────────────────────────┘
```

## Lottery - User Actions Tab

```
┌─────────────────────────────────────────────────────┐
│  Buy Tickets (MORBIUS)  [?]                        │
│  Purchase lottery tickets for the current round     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Approval Amount (MORBIUS)                         │
│  ┌──────────────────┐  ┌─────────┐                │
│  │ 1000000          │  │ Approve │                 │
│  └──────────────────┘  └─────────┘                 │
│                                                     │
│  Ticket Numbers (JSON Array)                       │
│  ┌────────────────────────────────────────┐        │
│  │ [[1,2,3,4,5,6], [7,8,9,10,11,12]]     │        │
│  │                                        │        │
│  └────────────────────────────────────────┘        │
│  Format: Array of arrays. Each inner...           │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │         Buy Tickets                    │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Buy Tickets for Multiple Rounds  [?]              │
│  Buy tickets for current and future rounds          │
├─────────────────────────────────────────────────────┤
│  [Similar layout with ticket groups & offsets]     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Buy Tickets with WPLS  [?]                        │
│  Buy tickets with WPLS - auto-swaps to MORBIUS     │
├─────────────────────────────────────────────────────┤
│  [WPLS approval + tickets + extra buffer]          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Claim Winnings  [?]                               │
│  Claim your prize from a finalized round           │
├─────────────────────────────────────────────────────┤
│  Round ID                                           │
│  ┌──────────────────┐                              │
│  │ 5                │                              │
│  └──────────────────┘                              │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │      Claim Winnings                    │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Lottery - Admin Actions Tab

```
┌─────────────────────────────────────────────────────┐
│  Finalize Round  [?]                               │
│  Finalize the current round if time has expired    │
├─────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐        │
│  │   Finalize Current Round               │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Update Settings (Owner Only)  [?]                 │
│  Configure lottery parameters                       │
├─────────────────────────────────────────────────────┤
│  Round Duration (seconds)                          │
│  ┌──────────────────┐  ┌─────────┐                │
│  │ 86400            │  │ Update  │                 │
│  └──────────────────┘  └─────────┘                 │
│                                                     │
│  MegaMORBIUS Interval (rounds)                     │
│  ┌──────────────────┐  ┌─────────┐                │
│  │ 5                │  │ Update  │                 │
│  └──────────────────┘  └─────────┘                 │
│                                                     │
│  Block Delay                                        │
│  ┌──────────────────┐  ┌─────────┐                │
│  │ 0                │  │ Update  │                 │
│  └──────────────────┘  └─────────┘                 │
└─────────────────────────────────────────────────────┘
```

## Lottery - Statistics Tab

```
┌─────────────────────────────────────────────────────┐
│  Current Round Information  [?]        [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Round ID        │  State                          │
│  5               │  OPEN                           │
│                  │                                 │
│  Total MORBIUS   │  Total Tickets                 │
│  100,000         │  100                           │
│                  │                                 │
│  Unique Players  │  Time Remaining                │
│  42              │  1234m                          │
│                  │                                 │
│  MegaMORBIUS Round                                 │
│  YES 🎰                                            │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Your Lifetime Statistics  [?]         [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Tickets Bought  │  Total Spent                    │
│  50              │  50,000                         │
│                  │                                 │
│  Total Claimed   │  Claimable Now                 │
│  25,000          │  5,000                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Global Statistics  [?]                [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Total Tickets Ever    │  Total Collected          │
│  1,250                 │  1,250,000                │
│                        │                           │
│  Total Claimed         │  Outstanding Prizes       │
│  625,000               │  100,000                  │
│                        │                           │
│  MegaMORBIUS Bank                                  │
│  250,000 MORBIUS                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Prize Distribution Configuration  [?] [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Bracket Percentages (of 60% Winners Pool)        │
│                                                     │
│  Bracket 1  │  Bracket 2  │  Bracket 3           │
│  4.0%       │  6.0%       │  10.0%               │
│                                                     │
│  Bracket 4  │  Bracket 5  │  Bracket 6           │
│  15.0%      │  20.0%      │  45.0%               │
│                                                     │
│  Winners Pool  │  Burn      │  MegaMORBIUS        │
│  60%           │  20%       │  20%                │
└─────────────────────────────────────────────────────┘
```

## Keno - Player Actions Tab

```
┌─────────────────────────────────────────────────────┐
│  Buy Keno Ticket  [?]                              │
│  Pick your numbers and add-ons for multi-draw      │
├─────────────────────────────────────────────────────┤
│  Approval Amount (MORBIUS)                         │
│  ┌──────────────────┐  ┌─────────┐                │
│  │ 10               │  │ Approve │                 │
│  └──────────────────┘  └─────────┘                 │
│                                                     │
│  Round ID                                          │
│  ┌──────────────────────────────────────┐          │
│  │ 1                                    │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  Your Numbers (JSON Array 1-80)                   │
│  ┌────────────────────────────────────────┐        │
│  │ [1,2,3,4,5,6,7,8,9,10]                │        │
│  │                                        │        │
│  └────────────────────────────────────────┘        │
│                                                     │
│  Spot Size (1-10)     │  Number of Draws          │
│  ┌──────────────────┐ │ ┌──────────────────┐      │
│  │ 10               │ │ │ 1                │      │
│  └──────────────────┘ │ └──────────────────┘      │
│                                                     │
│  Wager Per Draw (MORBIUS)                         │
│  ┌──────────────────────────────────────┐          │
│  │ 0.001                                │          │
│  └──────────────────────────────────────┘          │
│                                                     │
│  Add-Ons (optional)                                │
│  ☑ Multiplier (1x-10x random multiplier)          │
│  ☑ Bulls-Eye (3x payout if special number hit)    │
│  ☐ Plus 3 (Draw 3 extra numbers)                  │
│  ☑ Progressive Jackpot (9/10 spots wins)          │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │      Buy Keno Ticket                   │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Claim Prize  [?]                                  │
│  Claim prizes from finalized rounds                │
├─────────────────────────────────────────────────────┤
│  [Round ID and Ticket ID inputs + Claim button]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Auto-Claim Settings  [?]                          │
│  Enable automatic prize claiming (gas-limited)     │
├─────────────────────────────────────────────────────┤
│  Auto-Claim Status                                 │
│  ENABLED ✓                                         │
│                                                     │
│  ┌────────────────────────────────────────┐        │
│  │      Disable Auto-Claim                │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Keno - Statistics Tab

```
┌─────────────────────────────────────────────────────┐
│  Your Keno Statistics  [?]             [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Total Wagered   │  Total Won                      │
│  10.5            │  12.3                           │
│                  │                                 │
│  Tickets Bought  │  Win Count                     │
│  50              │  25                             │
│                  │                                 │
│  Win Rate        │  Net P&L                       │
│  50.00%          │  +1.8                           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Progressive Jackpot Stats  [?]        [Refresh]   │
├─────────────────────────────────────────────────────┤
│  Current Jackpot Pool                              │
│  150,000 MORBIUS                                   │
│                                                     │
│  Base Seed       │  Cost Per Draw                  │
│  100,000         │  0.001                          │
│                  │                                 │
│  Total Collected │  Total Paid                    │
│  75,000          │  50,000                         │
│                  │                                 │
│  Win Count       │  Last Win Round                │
│  5               │  42                             │
└─────────────────────────────────────────────────────┘
```

## Tooltip Example

```
┌────────────────────────────────────────────┐
│  Buy Tickets (MORBIUS)  [?] ←─────┐       │
└────────────────────────────────────│───────┘
                                     │
     ┌───────────────────────────────┘
     │
     ▼
┌────────────────────────────────────────────┐
│  Purchase lottery tickets with MORBIUS     │
│  tokens                                    │
│                                            │
│  Example:                                  │
│  [[1,2,3,4,5,6], [7,8,9,10,11,12]]        │
│                                            │
│  Each ticket costs 1,000 MORBIUS. You     │
│  must approve the contract first. Pick 6   │
│  unique numbers between 1-55 per ticket.   │
└────────────────────────────────────────────┘
```

## Color Scheme

```
Background: Dark theme (rgba(2, 6, 23, 0.95))
Cards: Black/40 with white/10 borders
Primary: Purple-600 (#9333ea)
Success: Green-500 (#22c55e)
Error: Red-500 (#ef4444)
Warning: Yellow-500 (#eab308)
Text: White with varying opacity
```

## Responsive Behavior

### Desktop (1024px+)
- Full layout with all sections visible
- Side-by-side statistics cards
- Wide input fields

### Tablet (768px - 1023px)
- Stacked cards
- Full-width inputs
- Navigation remains horizontal

### Mobile (< 768px)
- Single column layout
- Stacked navigation
- Touch-friendly buttons
- Reduced padding

## Interactive Elements

### Buttons
```
┌────────────────────────────────────┐
│          Button Text               │  ← Hover: brightness increase
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  ⏳ Loading...                     │  ← Loading state
└────────────────────────────────────┘

┌────────────────────────────────────┐
│          Button Text               │  ← Disabled: opacity 50%
└────────────────────────────────────┘
```

### Alerts
```
┌────────────────────────────────────────┐
│ ✓  Success message goes here           │  ← Green background
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⚠  Warning message goes here           │  ← Yellow background
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ✗  Error message goes here             │  ← Red background
└────────────────────────────────────────┘
```

## Navigation Flow

```
Home Page (/)
    │
    ├─→ Lottery Tab (default)
    │       ├─→ User Actions
    │       ├─→ Admin Actions
    │       └─→ Statistics
    │
    ├─→ Keno Tab
    │       ├─→ Player Actions
    │       ├─→ Admin Actions
    │       └─→ Statistics
    │
    └─→ Back to Home (via header)
```

## Key User Flows

### Flow 1: Buy Lottery Ticket
```
1. Connect Wallet (via header)
2. Navigate to /contracts
3. Stay on "Lottery 6-of-55" tab
4. Click "User Actions"
5. Approve MORBIUS tokens
6. Enter ticket numbers
7. Click "Buy Tickets"
8. Confirm in wallet
9. See success message
```

### Flow 2: Claim Winnings
```
1. Ensure wallet connected
2. Navigate to /contracts
3. Click "Statistics" tab
4. Check "Claimable Now" amount
5. Switch to "User Actions" tab
6. Enter round ID
7. Click "Claim Winnings"
8. Confirm in wallet
9. See success message
```

### Flow 3: View Statistics
```
1. Navigate to /contracts (wallet optional)
2. Click "Statistics" tab
3. View current round info
4. View personal stats (wallet required)
5. View global stats
6. Click refresh buttons to update
```

## Tips for Best UX

1. **Always show loading states**
   - Buttons show spinner during transactions
   - Cards show loader during data fetch

2. **Provide immediate feedback**
   - Toast notifications for all actions
   - Success/error alerts in forms
   - Transaction hash links

3. **Make tooltips accessible**
   - Hover to show
   - Touch-friendly on mobile
   - Clear, concise information

4. **Validate before submission**
   - Check JSON format
   - Verify number ranges
   - Ensure wallet connected

5. **Use consistent patterns**
   - Same layout for similar actions
   - Consistent button placement
   - Uniform card styling

This visual guide should help you understand the layout and flow of the contract interface!




