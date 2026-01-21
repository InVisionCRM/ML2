export interface Player {
    id: string;
    wallet_address: string;
    created_at: Date;
    updated_at: Date;
    last_seen: Date;
}
export interface GameSession {
    id: string;
    player_id: string;
    server_seed_hash: string;
    client_seed?: string;
    nonce: number;
    created_at: Date;
    ended_at?: Date;
    status: 'active' | 'completed' | 'abandoned';
    total_bet: bigint;
    total_win: bigint;
    game_count: number;
}
export interface GameHand {
    id: string;
    game_id: string;
    hand_index: number;
    cards: any[];
    total?: number;
    has_ace: boolean;
    is_blackjack: boolean;
    is_bust: boolean;
    bet_amount: bigint;
    result?: 'win' | 'loss' | 'push' | 'blackjack' | 'ongoing';
    payout: bigint;
    actions: any[];
    created_at: Date;
    completed_at?: Date;
}
export interface Game {
    id: string;
    session_id: string;
    game_number: number;
    total_bet_amount: bigint;
    dealer_cards: any[];
    dealer_total?: number;
    dealer_actions: any[];
    result?: 'win' | 'loss' | 'push' | 'blackjack' | 'ongoing';
    total_payout: bigint;
    actions: any[];
    created_at: Date;
    completed_at?: Date;
    server_seed_revealed: boolean;
    client_seed_commitment?: string;
    dealer_seed?: string;
    hand_count: number;
    current_hand_index: number;
}
export interface PlayerStats {
    total_games: number;
    total_bet: bigint;
    total_win: bigint;
    win_rate: number;
    blackjack_count: number;
}
export declare class DatabaseService {
    private pool;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getOrCreatePlayer(walletAddress: string): Promise<Player>;
    updatePlayerLastSeen(playerId: string): Promise<void>;
    getPlayerStats(walletAddress: string): Promise<PlayerStats>;
    createGameSession(playerId: string, serverSeedHash: string): Promise<GameSession>;
    getActiveSession(playerId: string): Promise<GameSession | null>;
    updateSessionStats(sessionId: string, betAmount: bigint, winAmount: bigint): Promise<void>;
    endSession(sessionId: string): Promise<void>;
    createGame(sessionId: string, gameData: Partial<Game>): Promise<Game>;
    createGameHand(gameId: string, handData: Partial<GameHand>): Promise<GameHand>;
    updateGameHand(handId: string, updates: Partial<GameHand>): Promise<void>;
    getGameHands(gameId: string): Promise<GameHand[]>;
    updateGame(gameId: string, updates: Partial<Game>): Promise<void>;
    getGame(gameId: string): Promise<Game | null>;
    getSessionGames(sessionId: string): Promise<Game[]>;
    revealServerSeed(gameId: string, serverSeedHash: string, serverSeed: string): Promise<void>;
    createSettlement(gameId: string, playerAddress: string, amount: bigint): Promise<string>;
    updateSettlementStatus(settlementId: string, transactionHash: string, status: 'confirmed' | 'failed'): Promise<void>;
    addActiveConnection(playerId: string, connectionId: string): Promise<void>;
    removeActiveConnection(connectionId: string): Promise<void>;
    updateConnectionPing(connectionId: string): Promise<void>;
    cleanupOldConnections(): Promise<number>;
    withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=database.service.d.ts.map