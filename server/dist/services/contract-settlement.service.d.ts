import { DatabaseService } from './database.service';
export interface SettlementRequest {
    gameId: string;
    playerAddress: string;
    amount: bigint;
    gameHash: string;
    gameData: any;
}
export declare class ContractSettlementService {
    private dbService;
    private publicClient;
    private walletClient;
    private contractAddress;
    constructor(dbService: DatabaseService, privateKey?: string);
    /**
     * Settle a game result on-chain
     */
    settleGame(request: SettlementRequest): Promise<{
        success: boolean;
        transactionHash?: string;
        error?: string;
    }>;
    /**
     * Store settlement for manual processing when automatic settlement fails
     */
    private storeSettlementForManualProcessing;
    /**
     * Check contract balance
     */
    getContractBalance(): Promise<bigint>;
    /**
     * Get player reserve balance
     */
    getPlayerReserve(playerAddress: string): Promise<bigint>;
    /**
     * Check if settlement is valid (has enough balance for payout)
     */
    validateSettlement(request: SettlementRequest): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    /**
     * Process pending settlements (for manual processing)
     */
    processPendingSettlements(): Promise<{
        processed: number;
        failed: number;
    }>;
    /**
     * Emergency withdraw from contract (admin function)
     */
    emergencyWithdraw(amount: bigint, toAddress: string): Promise<{
        success: boolean;
        transactionHash?: string;
        error?: string;
    }>;
    /**
     * Get contract statistics
     */
    getContractStats(): Promise<{
        balance: bigint;
        totalReserves: bigint;
        emergencyPaused: boolean;
    }>;
}
//# sourceMappingURL=contract-settlement.service.d.ts.map