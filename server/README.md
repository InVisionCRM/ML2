# Blackjack Server

Stake.com-style Blackjack server with provably fair gameplay and real-time WebSocket communication.

## Features

- **Provably Fair**: HMAC-SHA256 random number generation
- **Real-time Gameplay**: WebSocket-based interactive blackjack
- **Reserve System**: Player deposits/withdrawals with MORBIUS tokens
- **PostgreSQL Storage**: Game state and player data persistence
- **On-chain Settlements**: Automatic blockchain settlement (optional)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   # Run the schema on your Neon PostgreSQL database
   psql $DATABASE_URL -f schema.sql
   ```

4. **Build and run:**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `PULSECHAIN_RPC_URL` | PulseChain RPC endpoint | Yes |
| `BLACKJACK_CONTRACT_ADDRESS` | Deployed contract address | Yes |
| `SETTLEMENT_PRIVATE_KEY` | Private key for settlements | No |
| `PORT` | Server port (default: 3001) | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## API Endpoints

### REST API

- `GET /health` - Health check
- `GET /api/player/:address/stats` - Get player statistics
- `GET /api/game/:gameId/verify` - Verify game result

### WebSocket API

Connect to `ws://localhost:3001?address=<player_address>`

#### Messages

**Client → Server:**
```json
{
  "type": "create_game",
  "payload": {
    "betAmount": "1000000000000000000",
    "clientSeedCommitment": "optional_seed_hash"
  },
  "requestId": "optional_id"
}
```

```json
{
  "type": "player_action",
  "payload": {
    "gameId": "uuid",
    "action": "hit|stand|double_down",
    "clientSeed": "revealed_seed"
  },
  "requestId": "optional_id"
}
```

**Server → Client:**
```json
{
  "type": "game_created",
  "payload": {
    "gameId": "uuid",
    "playerCards": [10, 7],
    "dealerCards": [1], // Hidden second card
    "status": "player_turn",
    "canHit": true,
    "canStand": true,
    "canDoubleDown": true
  },
  "requestId": "echoed_id"
}
```

## Provably Fair System

The server uses HMAC-SHA256 for provably fair random generation:

1. **Server Seed**: Cryptographically secure random seed
2. **Client Seed**: Player-provided seed (committed first, revealed later)
3. **Nonce**: Game-specific counter
4. **HMAC**: `HMAC_SHA256(server_seed, client_seed + nonce)`

### Verification

Games can be verified using:
```javascript
GET /api/game/:gameId/verify
```

Returns verification details including expected vs actual card values.

## Database Schema

- `players` - Player information and wallets
- `game_sessions` - Active game sessions
- `games` - Individual game records
- `settlements` - On-chain settlement records
- `seed_reveals` - Provably fair seed revelations
- `active_connections` - WebSocket connection tracking

## Development

```bash
# Development with auto-reload
npm run dev

# Build for production
npm run build

# Run in production
npm start
```

## Security

- Rate limiting on all endpoints
- Input validation and sanitization
- WebSocket authentication via player address
- Emergency pause functionality
- Comprehensive logging with Winston

## Settlement System

The server can automatically settle games on-chain if `SETTLEMENT_PRIVATE_KEY` is configured. Otherwise, settlements are stored for manual processing.

Settlements use the contract's `settleGame()` function with provably fair verification data.