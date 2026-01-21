import { DatabaseService } from './database.service';
import { BlackjackGameService } from './blackjack-game.service';
export declare class WebSocketService {
    private gameService;
    private dbService;
    private wss;
    private clients;
    private heartbeatInterval;
    constructor(server: any, gameService: BlackjackGameService, dbService: DatabaseService);
    private handleConnection;
    private handleMessage;
    private handleCreateGame;
    private handlePlayerAction;
    private handleGetGameState;
    private sendMessage;
    private sendError;
    private broadcastToPlayer;
    getConnectionCount(): number;
    getActivePlayersCount(): Promise<number>;
    shutdown(): void;
}
//# sourceMappingURL=websocket.service.d.ts.map