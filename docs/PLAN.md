## Plan that must be followed exactly (execution-ready)
**Scope**
- Contract: rename all MORBIUS references to MORBIUS (vars, events, comments, constructor params, state fields, ABI).
- Add read helpers: current totals, pending for round, rollover state, bracket config, unclaimed per round, cumulative totals (tickets bought, MORBIUS collected, MORBIUS claimed, outstanding claimable), per-player lifetime stats, player round history (paginated), round history totals. Show finalized totals even when current round has zero sales.
- house ticket: contract-held ticket each round; any winnings go to MegaMORBIUS bank.x

**Files (Solidity)**
- `contracts/contracts/SuperStakeLottery6of55V2.sol` (main changes)
- Regenerate ABI: `abi/lottery6of55-v2.json` and TS wrappers that import it.

**Changes**
1) Rename MORBIUS → MORBIUS
   - Rename token references: `_MORBIUSTokenAddress` → `_MORBIUSTokenAddress`, `MORBIUS_TOKEN` → `MORBIUS_TOKEN`.
   - State fields: `currentRoundTotalMORBIUS` → `currentRoundTotalMORBIUS`, `pendingRoundMORBIUS` → `pendingRoundMORBIUS`, `megaMORBIUSBank` → `megaMORBIUSBank`, etc.
   - Events/arguments/revert strings: change “MORBIUS” to “MORBIUS”.
   - Comments/docs updated; regenerate ABI.

2) New read helpers (view)
   - `getCurrentRoundTotals()` → (roundId, totalMORBIUS, totalTickets, uniquePlayers, rolloverReserve, megaMORBIUSBank, currentRoundState).
   - `getPendingForRound(uint256)` → (pendingMORBIUS, pendingTickets).
   - `getRolloverState()` → (rolloverReserve, megaMORBIUSBank).
   - `getBracketConfig()` → BRACKET_PERCENTAGES + top-level distribution (winners/burn/mega).
   - `getUnclaimedForRound(uint256)` → per-bracket (pool, winners, paid, unclaimed) + totals.
   - `getTotalTicketsEver()` → cumulative tickets.
   - `getTotalMORBIUSEverCollected()` → cumulative MORBIUS collected.
   - `getTotalMORBIUSEverClaimed()` → cumulative claimed.
   - `getTotalMORBIUSClaimableAll()` → outstanding claimable (maintain counter on finalize/claim).
   - `getPlayerLifetime(address)` → (ticketsBought, totalSpent, totalClaimed, totalClaimable).
   - `getPlayerRoundHistory(address,uint256 start,uint256 count)` → paginated player round records.
   - `getRoundHistoryTotals(uint256 roundId)` → totals for that round (collected, winners pool, burn, mega contrib, unclaimed/rollover).

3) House ticket to MegaMORBIUS (optional but requested)
   - Config flag; on round start, generate one internal ticket; if it wins, payout goes to megaMORBIUSBank instead of a player.
   - Funding: clarify (reserved balance).
   - RNG fairness: use same RNG/path as user tickets; mark with a flag to divert payout.

4) Finalized totals fallback
   - Expose finalized totals in read helper so UI can display last finalized round when current round has zero sales.

5) ABI / Frontend follow-up
   - Regenerate `abi/lottery6of55-v2.json` and update TS exports/imports to MORBIUS naming.

**Assumptions**
 - Ticket price remains 1e18 MORBIUS.
 - Distribution percentages unchanged (60/20/20; brackets unchanged).
 - We will not iterate large storage; maintain running counters on writes.

**Next**
 - If approved, implement Solidity changes, regenerate ABI, and outline deploy steps. UI follow-up can consume the new reads and show finalized totals when current is zero.

