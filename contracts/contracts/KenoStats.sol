// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title KenoStats - View-only helper contract for CryptoKeno
 * @notice Provides enhanced getter functions for CryptoKeno data
 * @dev Reads from deployed CryptoKeno contract - no state, only views
 */

interface ICryptoKeno {
    struct Ticket {
        address player;
        uint64 firstRoundId;
        uint8 draws;
        uint8 spotSize;
        uint8 drawsRemaining;
        uint256 wagerPerDraw;
        uint256 numbersBitmap;
    }

    struct Round {
        uint256 id;
        uint64 startTime;
        uint64 endTime;
        uint8 state; // RoundState enum: 0=OPEN, 1=CLOSED, 2=FINALIZED
        bytes32 requestId;
        bytes32 randomSeed;
        uint8[20] winningNumbers;
        uint256 totalBaseWager;
        uint256 poolBalance;
    }

    function tickets(uint256) external view returns (Ticket memory);
    function rounds(uint256) external view returns (Round memory);
    function playerTickets(address, uint256) external view returns (uint256);
    function claimed(uint256 roundId, uint256 ticketId) external view returns (bool);
    function paytable(uint8 spotSize, uint8 hits) external view returns (uint256);
    function playerTotalWagered(address) external view returns (uint256);
    function playerTotalWon(address) external view returns (uint256);
    function playerTicketCount(address) external view returns (uint256);
    function playerWinCount(address) external view returns (uint256);
    function currentRoundId() external view returns (uint256);
    function roundDuration() external view returns (uint256);
    function maxSpot() external view returns (uint8);
    function MIN_SPOT() external view returns (uint8);
    function MIN_WAGER() external view returns (uint256);
    function maxWagerPerDraw() external view returns (uint256);
    function wrappedPulse() external view returns (address);
    function pulseXRouter() external view returns (address);
    function token() external view returns (address);
    function pendingBurnToken() external view returns (uint256);
    function getAllPlayerTickets(address player) external view returns (uint256[] memory);
}

contract KenoStats {
    ICryptoKeno public immutable keno;
    uint8 public constant NUMBERS = 80;
    uint8 public constant DRAWN = 20;

    constructor(address kenoAddress) {
        require(kenoAddress != address(0), "Invalid keno address");
        keno = ICryptoKeno(kenoAddress);
    }

    // ============ HELPER FUNCTIONS ============

    function decodeNumbers(uint256 bitmap) public pure returns (uint8[] memory) {
        uint8 count = 0;
        for (uint8 i = 0; i < NUMBERS; i++) {
            if ((bitmap & (uint256(1) << i)) != 0) {
                count++;
            }
        }

        uint8[] memory numbers = new uint8[](count);
        uint8 index = 0;
        for (uint8 i = 0; i < NUMBERS; i++) {
            if ((bitmap & (uint256(1) << i)) != 0) {
                numbers[index++] = i + 1;
            }
        }
        return numbers;
    }

    function _scoreTicket(uint256 numbersBitmap, uint8[DRAWN] memory winning) internal pure returns (uint256 hits) {
        for (uint8 i = 0; i < DRAWN; i++) {
            uint8 n = winning[i];
            if ((numbersBitmap & (uint256(1) << (n - 1))) != 0) {
                hits++;
            }
        }
    }

    function _ticketCoversRound(ICryptoKeno.Ticket memory ticket, uint256 roundId) internal pure returns (bool) {
        if (roundId < ticket.firstRoundId) return false;
        uint256 lastRound = uint256(ticket.firstRoundId) + ticket.draws - 1;
        return roundId <= lastRound;
    }

    // ============ STRUCTS ============

    struct TicketDetails {
        address player;
        uint256 ticketId;
        uint8[] pickedNumbers;
        uint64 firstRoundId;
        uint8 totalDraws;
        uint8 drawsCompleted;
        uint8 drawsRemaining;
        uint256 costPerDraw;
        uint256 totalCost;
        bool isExpired;
        uint256 totalWinnings;
        uint256 unclaimedWinnings;
    }

    struct RoundResult {
        uint256 roundId;
        uint8[] winningNumbers;
        uint8 matches;
        uint256 payout;
        string status;
    }

    struct PlayerLifetimeStats {
        uint256 totalTicketsBought;
        uint256 totalMORBIUSSpent;
        uint256 totalMORBIUSWon;
        uint256 totalClaimed;
        uint256 totalUnclaimed;
        int256 profitLoss;
        uint256 roiPercent;
        uint256 totalRoundsPlayed;
        uint256 totalWins;
    }

    struct PlayerTicketCount {
        uint256 totalTickets;
        uint256 activeTickets;
        uint256 expiredTickets;
        uint256 winningTickets;
    }

    struct CurrentRoundInfo {
        uint256 roundId;
        uint256 startTime;
        uint256 estimatedDrawTime;
    }

    struct GameConfiguration {
        uint256 roundDuration;
        uint8 minSpotSize;
        uint8 maxSpotSize;
        bool plsPurchasesEnabled;
        address pulseXRouterAddress;
        uint256 minWagerPerDraw;
        uint256 maxWagerPerDraw;
    }

    struct TicketRoundCheck {
        bool didWin;
        uint8 matches;
        uint256 payoutAmount;
    }

    // ============ GETTERS ============

    /**
     * Getter 1: Get Full Ticket Details
     */
    function getFullTicketDetails(uint256 ticketId) external view returns (TicketDetails memory) {
        ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);
        uint8[] memory pickedNumbers = decodeNumbers(ticket.numbersBitmap);

        uint8 drawsCompleted = ticket.draws - ticket.drawsRemaining;
        uint256 totalCost = ticket.wagerPerDraw * ticket.draws;
        bool isExpired = ticket.drawsRemaining == 0;

        uint256 totalWinnings = 0;
        uint256 unclaimedWinnings = 0;

        for (uint256 i = 0; i < ticket.draws; i++) {
            uint256 roundId = uint256(ticket.firstRoundId) + i;
            ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

            if (roundInfo.state == 2) { // FINALIZED
                uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                totalWinnings += prize;

                if (!keno.claimed(roundId, ticketId)) {
                    unclaimedWinnings += prize;
                }
            }
        }

        return TicketDetails({
            player: ticket.player,
            ticketId: ticketId,
            pickedNumbers: pickedNumbers,
            firstRoundId: ticket.firstRoundId,
            totalDraws: ticket.draws,
            drawsCompleted: drawsCompleted,
            drawsRemaining: ticket.drawsRemaining,
            costPerDraw: ticket.wagerPerDraw,
            totalCost: totalCost,
            isExpired: isExpired,
            totalWinnings: totalWinnings,
            unclaimedWinnings: unclaimedWinnings
        });
    }

    /**
     * Getter 2: Get Ticket Round Results
     */
    function getTicketRoundResults(uint256 ticketId) external view returns (RoundResult[] memory) {
        ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);
        RoundResult[] memory results = new RoundResult[](ticket.draws);

        for (uint256 i = 0; i < ticket.draws; i++) {
            uint256 roundId = uint256(ticket.firstRoundId) + i;
            ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

            uint8[] memory winningNums;
            uint8 matches = 0;
            uint256 payout = 0;
            string memory status = "pending";

            if (roundInfo.state == 2) { // FINALIZED
                winningNums = new uint8[](DRAWN);
                for (uint8 j = 0; j < DRAWN; j++) {
                    winningNums[j] = roundInfo.winningNumbers[j];
                }

                matches = uint8(_scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers));
                payout = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, matches);
                status = payout > 0 ? "won" : "lost";
            }

            results[i] = RoundResult({
                roundId: roundId,
                winningNumbers: winningNums,
                matches: matches,
                payout: payout,
                status: status
            });
        }

        return results;
    }

    /**
     * Getter 3: Get Ticket Status
     */
    function getTicketStatus(uint256 ticketId) external view returns (string memory) {
        ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);

        if (ticket.drawsRemaining == 0) {
            for (uint256 i = 0; i < ticket.draws; i++) {
                uint256 roundId = uint256(ticket.firstRoundId) + i;
                ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

                if (roundInfo.state == 2 && !keno.claimed(roundId, ticketId)) {
                    uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                    uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                    if (prize > 0) {
                        return "Claimable";
                    }
                }
            }
            return "Expired";
        }

        return "Active";
    }

    /**
     * Getter 4: Get Ticket Unclaimed Winnings
     */
    function getTicketUnclaimedWinnings(uint256 ticketId) external view returns (uint256 totalUnclaimed) {
        ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);

        for (uint256 i = 0; i < ticket.draws; i++) {
            uint256 roundId = uint256(ticket.firstRoundId) + i;
            ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

            if (roundInfo.state == 2 && !keno.claimed(roundId, ticketId)) {
                uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                totalUnclaimed += prize;
            }
        }
    }

    /**
     * Getter 5: Get Player Lifetime Stats
     */
    function getPlayerLifetimeStats(address player) external view returns (PlayerLifetimeStats memory) {
        uint256 totalUnclaimed = 0;
        uint256 totalRoundsPlayed = 0;

        uint256[] memory playerTicketIds = keno.getAllPlayerTickets(player);
        for (uint256 i = 0; i < playerTicketIds.length; i++) {
            ICryptoKeno.Ticket memory ticket = keno.tickets(playerTicketIds[i]);
            totalRoundsPlayed += ticket.draws;

            for (uint256 j = 0; j < ticket.draws; j++) {
                uint256 roundId = uint256(ticket.firstRoundId) + j;
                ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

                if (roundInfo.state == 2 && !keno.claimed(roundId, playerTicketIds[i])) {
                    uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                    uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                    totalUnclaimed += prize;
                }
            }
        }

        uint256 totalWon = keno.playerTotalWon(player);
        uint256 totalSpent = keno.playerTotalWagered(player);
        uint256 totalClaimed = totalWon;
        int256 profitLoss = int256(totalWon + totalUnclaimed) - int256(totalSpent);
        uint256 roiPercent = totalSpent > 0 ? ((totalWon + totalUnclaimed) * 100) / totalSpent : 0;

        return PlayerLifetimeStats({
            totalTicketsBought: keno.playerTicketCount(player),
            totalMORBIUSSpent: totalSpent,
            totalMORBIUSWon: totalWon + totalUnclaimed,
            totalClaimed: totalClaimed,
            totalUnclaimed: totalUnclaimed,
            profitLoss: profitLoss,
            roiPercent: roiPercent,
            totalRoundsPlayed: totalRoundsPlayed,
            totalWins: keno.playerWinCount(player)
        });
    }

    /**
     * Getter 6: Get Player All Tickets
     */
    function getPlayerAllTickets(address player) external view returns (uint256[] memory) {
        return keno.getAllPlayerTickets(player);
    }

    /**
     * Getter 7: Get Player Active Tickets
     */
    function getPlayerActiveTickets(address player) external view returns (uint256[] memory) {
        uint256[] memory allTickets = keno.getAllPlayerTickets(player);

        uint256 activeCount = 0;
        for (uint256 i = 0; i < allTickets.length; i++) {
            if (keno.tickets(allTickets[i]).drawsRemaining > 0) {
                activeCount++;
            }
        }

        uint256[] memory activeTickets = new uint256[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allTickets.length; i++) {
            if (keno.tickets(allTickets[i]).drawsRemaining > 0) {
                activeTickets[index++] = allTickets[i];
            }
        }

        return activeTickets;
    }

    /**
     * Getter 8: Get Player Claimable Tickets
     */
    function getPlayerClaimableTickets(address player) external view returns (uint256[] memory) {
        uint256[] memory allTickets = keno.getAllPlayerTickets(player);

        uint256 claimableCount = 0;
        for (uint256 i = 0; i < allTickets.length; i++) {
            uint256 ticketId = allTickets[i];
            ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);

            for (uint256 j = 0; j < ticket.draws; j++) {
                uint256 roundId = uint256(ticket.firstRoundId) + j;
                ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

                if (roundInfo.state == 2 && !keno.claimed(roundId, ticketId)) {
                    uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                    uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                    if (prize > 0) {
                        claimableCount++;
                        break;
                    }
                }
            }
        }

        uint256[] memory claimableTickets = new uint256[](claimableCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allTickets.length; i++) {
            uint256 ticketId = allTickets[i];
            ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);

            for (uint256 j = 0; j < ticket.draws; j++) {
                uint256 roundId = uint256(ticket.firstRoundId) + j;
                ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

                if (roundInfo.state == 2 && !keno.claimed(roundId, ticketId)) {
                    uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                    uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                    if (prize > 0) {
                        claimableTickets[index++] = ticketId;
                        break;
                    }
                }
            }
        }

        return claimableTickets;
    }

    /**
     * Getter 9: Get Player Ticket Count
     */
    function getPlayerTicketCount(address player) external view returns (PlayerTicketCount memory) {
        uint256[] memory allTickets = keno.getAllPlayerTickets(player);
        uint256 activeCount = 0;
        uint256 expiredCount = 0;
        uint256 winningCount = 0;

        for (uint256 i = 0; i < allTickets.length; i++) {
            uint256 ticketId = allTickets[i];
            ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);

            if (ticket.drawsRemaining > 0) {
                activeCount++;
            } else {
                expiredCount++;
            }

            bool hasWon = false;
            for (uint256 j = 0; j < ticket.draws; j++) {
                uint256 roundId = uint256(ticket.firstRoundId) + j;
                ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

                if (roundInfo.state == 2) {
                    uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
                    uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));
                    if (prize > 0) {
                        hasWon = true;
                        break;
                    }
                }
            }
            if (hasWon) winningCount++;
        }

        return PlayerTicketCount({
            totalTickets: allTickets.length,
            activeTickets: activeCount,
            expiredTickets: expiredCount,
            winningTickets: winningCount
        });
    }

    /**
     * Getter 10: Get Current Round Info
     */
    function getCurrentRoundInfo() external view returns (CurrentRoundInfo memory) {
        uint256 currentId = keno.currentRoundId();
        ICryptoKeno.Round memory currentRound = keno.rounds(currentId);

        return CurrentRoundInfo({
            roundId: currentId,
            startTime: currentRound.startTime,
            estimatedDrawTime: currentRound.endTime
        });
    }

    /**
     * Getter 11: Get Paytable
     */
    function getPaytable(uint8 spotSize) external view returns (uint256[] memory) {
        require(spotSize >= keno.MIN_SPOT() && spotSize <= keno.maxSpot(), "invalid spot size");

        uint256[] memory payouts = new uint256[](spotSize + 1);
        for (uint8 i = 0; i <= spotSize; i++) {
            payouts[i] = keno.paytable(spotSize, i);
        }
        return payouts;
    }

    /**
     * Getter 12: Get Ticket Price
     */
    function getTicketPrice(uint8 /* spotSize */, uint8 draws) external view returns (uint256) {
        return keno.MIN_WAGER() * draws;
    }

    /**
     * Getter 13: Get Game Configuration
     */
    function getGameConfiguration() external view returns (GameConfiguration memory) {
        return GameConfiguration({
            roundDuration: keno.roundDuration(),
            minSpotSize: keno.MIN_SPOT(),
            maxSpotSize: keno.maxSpot(),
            plsPurchasesEnabled: keno.wrappedPulse() != address(0),
            pulseXRouterAddress: keno.pulseXRouter(),
            minWagerPerDraw: keno.MIN_WAGER(),
            maxWagerPerDraw: keno.maxWagerPerDraw()
        });
    }

    /**
     * Getter 14: Check If Ticket Won Round
     */
    function checkIfTicketWonRound(uint256 ticketId, uint256 roundId) external view returns (TicketRoundCheck memory) {
        ICryptoKeno.Round memory roundInfo = keno.rounds(roundId);

        if (roundInfo.state != 2) { // Not FINALIZED
            return TicketRoundCheck({
                didWin: false,
                matches: 0,
                payoutAmount: 0
            });
        }

        ICryptoKeno.Ticket memory ticket = keno.tickets(ticketId);
        if (!_ticketCoversRound(ticket, roundId)) {
            return TicketRoundCheck({
                didWin: false,
                matches: 0,
                payoutAmount: 0
            });
        }

        uint256 hits = _scoreTicket(ticket.numbersBitmap, roundInfo.winningNumbers);
        uint256 prize = ticket.wagerPerDraw * keno.paytable(ticket.spotSize, uint8(hits));

        return TicketRoundCheck({
            didWin: prize > 0,
            matches: uint8(hits),
            payoutAmount: prize
        });
    }

    /**
     * Getter 15: Get Total Pool Size
     */
    function getTotalPoolSize() external view returns (uint256) {
        address tokenAddr = keno.token();
        uint256 balance = IERC20(tokenAddr).balanceOf(address(keno));
        return balance - keno.pendingBurnToken();
    }
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}
