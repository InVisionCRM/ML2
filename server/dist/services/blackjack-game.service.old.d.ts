import { DatabaseService } from './database.service';
import { ProvablyFairService } from './provably-fair.service';
export interface Hand {
    id: string;
    cards: number[];
    total: number;
    hasAce: boolean;
    isBlackjack: boolean;
    isBust: boolean;
    betAmount: bigint;
    result?: 'win' | 'loss' | 'push' | 'blackjack';
    payout: bigint;
    actions: any[];
    canHit: boolean;
    canStand: boolean;
    canDoubleDown: boolean;
    canSplit: boolean;
}
export interface GameState {
    gameId: string;
    sessionId: string;
    playerHands: Hand[];
    dealerCards: number[];
    dealerTotal: number;
    dealerHasAce: boolean;
    status: 'waiting' | 'player_turn' | 'dealer_turn' | 'completed';
    totalBetAmount: bigint;
    totalPayout: bigint;
    actions: any[];
    dealerActions: any[];
    currentHandIndex: number;
    canSplit: boolean;
    isBlackjack: boolean;
}
export interface CreateGameRequest {
    playerAddress: string;
    betAmount: bigint;
    clientSeedCommitment?: string;
}
export interface PlayerActionRequest {
    gameId: string;
    action: 'hit' | 'stand' | 'double_down' | 'split';
    handIndex?: number;
    clientSeed?: string;
}
export interface GameResult {
    gameId: string;
    playerCards: number[];
    dealerCards: number[];
    playerTotal: number;
    dealerTotal: number;
    result: 'win' | 'loss' | 'push' | 'blackjack';
    payout: bigint;
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    actions: any[];
    dealerActions: any[];
}
export declare class BlackjackGameService {
    private dbService;
    private pfService;
    constructor(dbService: DatabaseService, pfService: ProvablyFairService);
    /**
     * Create a new blackjack game
     */
    createGame(request: CreateGameRequest): Promise<GameState>;
    /**
     * Handle player action
     */
    handlePlayerAction(request: PlayerActionRequest): Promise<GameState>;
    /**
     * Play dealer's turn
     */
    private playDealerTurn;
    /**
     * Determine game winner
     */
    private determineWinner;
    /**
     * Get game result for verification
     */
    getGameResult(gameId: string): Promise<GameResult | null>;
    /**
     * Verify game result
     */
    verifyGame(gameId: string): Promise<{
        verified: boolean;
        details: any;
    }>;
}
//# sourceMappingURL=blackjack-game.service.old.d.ts.map