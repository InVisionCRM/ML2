import { logger } from './logger';

export interface WebSocketMessage {
  type: string;
  payload: any;
  requestId?: string;
}

export interface GameState {
  gameId: string;
  sessionId: string;
  playerCards: number[];
  dealerCards: number[];
  playerTotal: number;
  dealerTotal: number;
  status: 'waiting' | 'player_turn' | 'dealer_turn' | 'completed';
  betAmount: bigint;
  result?: 'win' | 'loss' | 'push' | 'blackjack';
  payout: bigint;
  actions: any[];
  dealerActions: any[];
  canHit: boolean;
  canStand: boolean;
  canDoubleDown: boolean;
  isBlackjack: boolean;
}

export class BlackjackWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, (payload: any) => void> = new Map();
  private requestPromises: Map<string, { resolve: Function; reject: Function }> = new Map();

  constructor(
    private serverUrl: string = 'ws://localhost:3001',
    private playerAddress?: string
  ) {}

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      const url = this.playerAddress
        ? `${this.serverUrl}?address=${this.playerAddress}`
        : this.serverUrl;

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        logger.info('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        logger.info('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  /**
   * Disconnect from the server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  /**
   * Send a request and wait for response
   */
  private async sendRequest(type: string, payload: any): Promise<any> {
    const requestId = Math.random().toString(36).substring(7);

    return new Promise((resolve, reject) => {
      // Set timeout for request
      const timeout = setTimeout(() => {
        this.requestPromises.delete(requestId);
        reject(new Error('Request timeout'));
      }, 30000);

      this.requestPromises.set(requestId, {
        resolve: (data: any) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.send({ type, payload, requestId });
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string) {
    try {
      const message: WebSocketMessage = JSON.parse(data);

      // Handle request responses
      if (message.requestId) {
        const promise = this.requestPromises.get(message.requestId);
        if (promise) {
          this.requestPromises.delete(message.requestId);

          if (message.type === 'error') {
            promise.reject(new Error(message.payload.message));
          } else {
            promise.resolve(message.payload);
          }
          return;
        }
      }

      // Handle event messages
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message.payload);
      } else {
        logger.warn('Unhandled message type:', message.type);
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(() => {
        // Connection failed, will retry
      });
    }, delay);
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (payload: any) => void) {
    this.messageHandlers.set(event, handler);
  }

  /**
   * Remove event handler
   */
  off(event: string) {
    this.messageHandlers.delete(event);
  }

  // === Game API ===

  /**
   * Create a new game
   */
  async createGame(betAmount: bigint, clientSeedCommitment?: string): Promise<GameState> {
    return this.sendRequest('create_game', {
      betAmount: betAmount.toString(),
      clientSeedCommitment
    });
  }

  /**
   * Perform a player action
   */
  async playerAction(gameId: string, action: 'hit' | 'stand' | 'double_down', clientSeed?: string): Promise<GameState> {
    return this.sendRequest('player_action', {
      gameId,
      action,
      clientSeed
    });
  }

  /**
   * Get game result for verification
   */
  async getGameResult(gameId: string): Promise<any> {
    return this.sendRequest('get_game_state', { gameId });
  }

  /**
   * Send ping to keep connection alive
   */
  ping(): void {
    this.send({ type: 'ping' });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}