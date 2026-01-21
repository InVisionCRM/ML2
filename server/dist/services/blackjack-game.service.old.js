"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlackjackGameService = void 0;
const logger_1 = require("../utils/logger");
class BlackjackGameService {
    dbService;
    pfService;
    constructor(dbService, pfService) {
        this.dbService = dbService;
        this.pfService = pfService;
    }
    /**
     * Create a new blackjack game
     */
    async createGame(request) {
        try {
            // Get or create player
            const player = await this.dbService.getOrCreatePlayer(request.playerAddress);
            // Get or create active session
            let session = await this.dbService.getActiveSession(player.id);
            if (!session) {
                const serverSeed = this.pfService.generateServerSeed();
                const serverSeedHash = this.pfService.createServerSeedHash(serverSeed);
                session = await this.dbService.createGameSession(player.id, serverSeedHash);
            }
            // Generate game seeds
            const gameNonce = session.game_count + 1;
            const dealerSeed = this.pfService.generateServerSeed();
            const gameSeeds = {
                serverSeed: session.server_seed_hash, // We'll reveal this later
                clientSeed: request.clientSeedCommitment || 'default',
                nonce: gameNonce
            };
            // Generate initial cards using provably fair randomness
            const randoms = this.pfService.generateBlackjackRandoms(gameSeeds, 4);
            // Deal cards: player gets 2 cards, dealer gets 2 cards (1 face down)
            const playerCards = [randoms[0], randoms[2]];
            const dealerCards = [randoms[1], randoms[3]];
            // Calculate totals
            const playerHand = this.pfService.calculateHandTotal(playerCards);
            const dealerHand = this.pfService.calculateHandTotal([dealerCards[0]]); // Only count visible card
            // Check for natural blackjacks
            const playerBlackjack = this.pfService.isNaturalBlackjack(playerCards);
            const dealerBlackjack = this.pfService.isNaturalBlackjack(dealerCards);
            // Determine game status
            let status = 'player_turn';
            let result;
            let payout = 0n;
            if (playerBlackjack && dealerBlackjack) {
                status = 'completed';
                result = 'push';
                payout = request.betAmount;
            }
            else if (playerBlackjack) {
                status = 'completed';
                result = 'blackjack';
                // 3:2 payout for natural blackjack
                payout = (request.betAmount * 3n) / 2n;
            }
            else if (dealerBlackjack) {
                status = 'completed';
                result = 'loss';
                payout = 0n;
            }
            // Create game record
            const game = await this.dbService.createGame(session.id, {
                game_number: gameNonce,
                bet_amount: request.betAmount,
                player_cards: playerCards,
                dealer_cards: dealerCards,
                player_total: playerHand.total,
                dealer_total: dealerHand.total,
                result,
                payout,
                client_seed_commitment: request.clientSeedCommitment,
                dealer_seed
            });
            // Update session stats
            if (result) {
                await this.dbService.updateSessionStats(session.id, request.betAmount, payout > request.betAmount ? payout - request.betAmount : 0n);
            }
            const gameState = {
                gameId: game.id,
                sessionId: session.id,
                playerCards,
                dealerCards: [dealerCards[0]], // Hide dealer's second card initially
                playerTotal: playerHand.total,
                dealerTotal: dealerHand.total,
                playerHasAce: playerHand.hasAce,
                dealerHasAce: dealerHand.hasAce,
                status,
                betAmount: request.betAmount,
                result,
                payout,
                actions: [],
                dealerActions: [],
                canHit: status === 'player_turn' && playerHand.total < 21,
                canStand: status === 'player_turn',
                canDoubleDown: status === 'player_turn' && playerCards.length === 2,
                isBlackjack: playerBlackjack
            };
            logger_1.logger.info('Game created', {
                gameId: game.id,
                playerAddress: request.playerAddress,
                betAmount: request.betAmount.toString(),
                status: gameState.status
            });
            return gameState;
        }
        catch (error) {
            logger_1.logger.error('Error creating game:', error);
            throw new Error('Failed to create game');
        }
    }
    /**
     * Handle player action
     */
    async handlePlayerAction(request) {
        try {
            const game = await this.dbService.getGame(request.gameId);
            if (!game) {
                throw new Error('Game not found');
            }
            if (game.result !== 'ongoing') {
                throw new Error('Game already completed');
            }
            const session = await this.dbService.getActiveSession(game.session_id);
            if (!session) {
                throw new Error('Session not found');
            }
            // If this is the first action, reveal client seed and generate server seed
            let clientSeed = game.client_seed_commitment;
            let serverSeed = session.server_seed_hash;
            if (request.clientSeed && game.client_seed_commitment) {
                // Verify client seed commitment
                if (!this.pfService.verifyClientSeedCommitment(game.client_seed_commitment, request.clientSeed)) {
                    throw new Error('Client seed does not match commitment');
                }
                clientSeed = request.clientSeed;
                // Generate actual server seed for this game
                serverSeed = this.pfService.generateServerSeed();
                // Update game with revealed seeds
                await this.dbService.updateGame(game.id, {
                    server_seed_revealed: true
                });
            }
            const gameSeeds = {
                serverSeed,
                clientSeed: clientSeed || 'default',
                nonce: game.game_number
            };
            let playerCards = [...game.player_cards];
            let dealerCards = [...game.dealer_cards];
            const actions = [...(game.actions || [])];
            // Handle player action
            if (request.action === 'hit') {
                // Deal new card
                const randoms = this.pfService.generateBlackjackRandoms(gameSeeds, 1);
                playerCards.push(randoms[0]);
                actions.push({ type: 'hit', card: randoms[0], timestamp: Date.now() });
            }
            else if (request.action === 'stand') {
                actions.push({ type: 'stand', timestamp: Date.now() });
            }
            else if (request.action === 'double_down') {
                if (playerCards.length !== 2) {
                    throw new Error('Can only double down on first two cards');
                }
                // Deal one more card and double bet
                const randoms = this.pfService.generateBlackjackRandoms(gameSeeds, 1);
                playerCards.push(randoms[0]);
                actions.push({ type: 'double_down', card: randoms[0], timestamp: Date.now() });
                // Automatically go to dealer turn
                request.action = 'stand';
            }
            // Calculate new totals
            const playerHand = this.pfService.calculateHandTotal(playerCards);
            // Check if player busted
            if (playerHand.total > 21) {
                // Player bust - dealer wins
                const dealerHand = this.pfService.calculateHandTotal(dealerCards);
                await this.dbService.updateGame(game.id, {
                    player_cards: playerCards,
                    player_total: playerHand.total,
                    dealer_total: dealerHand.total,
                    result: 'loss',
                    payout: 0n,
                    actions,
                    completed_at: new Date()
                });
                return {
                    gameId: game.id,
                    sessionId: game.session_id,
                    playerCards,
                    dealerCards, // Show all dealer cards
                    playerTotal: playerHand.total,
                    dealerTotal: dealerHand.total,
                    playerHasAce: playerHand.hasAce,
                    dealerHasAce: dealerHand.hasAce,
                    status: 'completed',
                    betAmount: game.bet_amount,
                    result: 'loss',
                    payout: 0n,
                    actions,
                    dealerActions: [],
                    canHit: false,
                    canStand: false,
                    canDoubleDown: false,
                    isBlackjack: false
                };
            }
            // If player stood or doubled down, dealer plays
            if (request.action === 'stand') {
                const dealerResult = await this.playDealerTurn(game.id, dealerCards, gameSeeds, actions);
                // Determine winner
                const dealerHand = this.pfService.calculateHandTotal(dealerResult.dealerCards);
                const finalResult = this.determineWinner(playerHand.total, dealerHand.total);
                let payout = 0n;
                if (finalResult === 'win') {
                    payout = game.bet_amount * 2n;
                }
                else if (finalResult === 'push') {
                    payout = game.bet_amount;
                }
                else if (finalResult === 'blackjack') {
                    payout = (game.bet_amount * 3n) / 2n;
                }
                await this.dbService.updateGame(game.id, {
                    player_cards: playerCards,
                    dealer_cards: dealerResult.dealerCards,
                    player_total: playerHand.total,
                    dealer_total: dealerHand.total,
                    result: finalResult,
                    payout,
                    actions,
                    dealer_actions: dealerResult.dealerActions,
                    completed_at: new Date()
                });
                return {
                    gameId: game.id,
                    sessionId: game.session_id,
                    playerCards,
                    dealerCards: dealerResult.dealerCards,
                    playerTotal: playerHand.total,
                    dealerTotal: dealerHand.total,
                    playerHasAce: playerHand.hasAce,
                    dealerHasAce: dealerHand.hasAce,
                    status: 'completed',
                    betAmount: game.bet_amount,
                    result: finalResult,
                    payout,
                    actions,
                    dealerActions: dealerResult.dealerActions,
                    canHit: false,
                    canStand: false,
                    canDoubleDown: false,
                    isBlackjack: finalResult === 'blackjack'
                };
            }
            // Player still has turn
            await this.dbService.updateGame(game.id, {
                player_cards: playerCards,
                player_total: playerHand.total,
                actions
            });
            return {
                gameId: game.id,
                sessionId: game.session_id,
                playerCards,
                dealerCards: [dealerCards[0]], // Keep dealer second card hidden
                playerTotal: playerHand.total,
                dealerTotal: this.pfService.calculateHandTotal([dealerCards[0]]).total,
                playerHasAce: playerHand.hasAce,
                dealerHasAce: this.pfService.calculateHandTotal([dealerCards[0]]).hasAce,
                status: 'player_turn',
                betAmount: game.bet_amount,
                actions,
                dealerActions: [],
                canHit: playerHand.total < 21,
                canStand: true,
                canDoubleDown: playerCards.length === 2,
                isBlackjack: false
            };
        }
        catch (error) {
            logger_1.logger.error('Error handling player action:', error);
            throw error;
        }
    }
    /**
     * Play dealer's turn
     */
    async playDealerTurn(gameId, dealerCards, gameSeeds, playerActions) {
        const dealerActions = [];
        let currentDealerCards = [...dealerCards];
        // Dealer hits on soft 17
        while (true) {
            const dealerHand = this.pfService.calculateHandTotal(currentDealerCards);
            if (dealerHand.total >= 17 && !(dealerHand.total === 17 && dealerHand.hasAce)) {
                // Dealer stands
                dealerActions.push({ type: 'stand', timestamp: Date.now() });
                break;
            }
            // Dealer hits
            const randoms = this.pfService.generateBlackjackRandoms({ ...gameSeeds, nonce: gameSeeds.nonce + 100 + dealerActions.length }, 1);
            currentDealerCards.push(randoms[0]);
            dealerActions.push({
                type: 'hit',
                card: randoms[0],
                timestamp: Date.now()
            });
            // Check for bust
            const newDealerHand = this.pfService.calculateHandTotal(currentDealerCards);
            if (newDealerHand.total > 21) {
                break;
            }
        }
        return { dealerCards: currentDealerCards, dealerActions };
    }
    /**
     * Determine game winner
     */
    determineWinner(playerTotal, dealerTotal) {
        if (playerTotal > 21)
            return 'loss';
        if (dealerTotal > 21)
            return 'win';
        if (playerTotal > dealerTotal)
            return 'win';
        if (playerTotal < dealerTotal)
            return 'loss';
        return 'push';
    }
    /**
     * Get game result for verification
     */
    async getGameResult(gameId) {
        try {
            const game = await this.dbService.getGame(gameId);
            if (!game || !game.result)
                return null;
            const session = await this.dbService.getActiveSession(game.session_id);
            if (!session)
                return null;
            return {
                gameId: game.id,
                playerCards: game.player_cards,
                dealerCards: game.dealer_cards,
                playerTotal: game.player_total || 0,
                dealerTotal: game.dealer_total || 0,
                result: game.result,
                payout: game.payout,
                serverSeed: session.server_seed_hash, // Revealed
                serverSeedHash: session.server_seed_hash,
                clientSeed: game.client_seed_commitment || 'default',
                nonce: game.game_number,
                actions: game.actions || [],
                dealerActions: game.dealer_actions || []
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting game result:', error);
            return null;
        }
    }
    /**
     * Verify game result
     */
    async verifyGame(gameId) {
        try {
            const game = await this.dbService.getGame(gameId);
            if (!game) {
                return { verified: false, details: 'Game not found' };
            }
            const session = await this.dbService.getActiveSession(game.session_id);
            if (!session) {
                return { verified: false, details: 'Session not found' };
            }
            // Verify the game result using provably fair system
            const seeds = {
                serverSeed: session.server_seed_hash,
                clientSeed: game.client_seed_commitment || 'default',
                nonce: game.game_number
            };
            // Regenerate the initial cards
            const randoms = this.pfService.generateBlackjackRandoms(seeds, 4);
            const expectedPlayerCards = [randoms[0], randoms[2]];
            const expectedDealerCards = [randoms[1], randoms[3]];
            // Check if cards match
            const playerCardsMatch = JSON.stringify(game.player_cards) === JSON.stringify(expectedPlayerCards);
            const dealerCardsMatch = JSON.stringify(game.dealer_cards.slice(0, 2)) === JSON.stringify(expectedDealerCards.slice(0, 2));
            return {
                verified: playerCardsMatch && dealerCardsMatch,
                details: {
                    gameId,
                    expectedPlayerCards,
                    actualPlayerCards: game.player_cards,
                    expectedDealerCards,
                    actualDealerCards: game.dealer_cards,
                    playerCardsMatch,
                    dealerCardsMatch
                }
            };
        }
        catch (error) {
            logger_1.logger.error('Error verifying game:', error);
            return { verified: false, details: error.message };
        }
    }
}
exports.BlackjackGameService = BlackjackGameService;
//# sourceMappingURL=blackjack-game.service.old.js.map