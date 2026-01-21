-- Blackjack Server Database Schema
-- Using Neon PostgreSQL

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    server_seed_hash VARCHAR(64) NOT NULL,
    client_seed VARCHAR(64),
    nonce BIGINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    total_bet BIGINT DEFAULT 0, -- in wei
    total_win BIGINT DEFAULT 0, -- in wei
    game_count INTEGER DEFAULT 0
);

-- Individual games within a session
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    game_number INTEGER NOT NULL,
    total_bet_amount BIGINT NOT NULL, -- in wei (sum of all hands)
    dealer_cards JSONB NOT NULL DEFAULT '[]',
    dealer_total INTEGER,
    dealer_actions JSONB DEFAULT '[]', -- array of dealer actions
    result VARCHAR(20) CHECK (result IN ('win', 'loss', 'push', 'blackjack', 'ongoing')),
    total_payout BIGINT DEFAULT 0, -- in wei (sum of all hands)
    actions JSONB DEFAULT '[]', -- array of player actions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    server_seed_revealed BOOLEAN DEFAULT FALSE,
    client_seed_commitment VARCHAR(64), -- for strategy commitment
    dealer_seed VARCHAR(64), -- for dealer actions
    hand_count INTEGER DEFAULT 1, -- number of hands (for splits)
    current_hand_index INTEGER DEFAULT 0 -- current active hand
);

-- Individual hands within a game (for splitting)
CREATE TABLE IF NOT EXISTS game_hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    hand_index INTEGER NOT NULL,
    cards JSONB NOT NULL DEFAULT '[]',
    total INTEGER,
    has_ace BOOLEAN DEFAULT FALSE,
    is_blackjack BOOLEAN DEFAULT FALSE,
    is_bust BOOLEAN DEFAULT FALSE,
    bet_amount BIGINT NOT NULL, -- in wei
    result VARCHAR(20) CHECK (result IN ('win', 'loss', 'push', 'blackjack', 'ongoing')),
    payout BIGINT DEFAULT 0, -- in wei
    actions JSONB DEFAULT '[]', -- array of actions for this hand
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Server seed reveals for verification
CREATE TABLE IF NOT EXISTS seed_reveals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    server_seed_hash VARCHAR(64) NOT NULL,
    server_seed VARCHAR(64) NOT NULL,
    revealed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settlement records
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id) ON DELETE CASCADE,
    player_address VARCHAR(42) NOT NULL,
    amount BIGINT NOT NULL, -- positive = win, negative = loss
    transaction_hash VARCHAR(66),
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Active connections for WebSocket management
CREATE TABLE IF NOT EXISTS active_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    connection_id VARCHAR(100) UNIQUE NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_player_id ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_games_session_id ON games(session_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(result);
CREATE INDEX IF NOT EXISTS idx_game_hands_game_id ON game_hands(game_id);
CREATE INDEX IF NOT EXISTS idx_game_hands_result ON game_hands(result);
CREATE INDEX IF NOT EXISTS idx_settlements_game_id ON settlements(game_id);
CREATE INDEX IF NOT EXISTS idx_active_connections_player_id ON active_connections(player_id);
CREATE INDEX IF NOT EXISTS idx_players_wallet_address ON players(wallet_address);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old active connections
CREATE OR REPLACE FUNCTION cleanup_old_connections()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_connections
    WHERE last_ping < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get player statistics
CREATE OR REPLACE FUNCTION get_player_stats(player_wallet VARCHAR(42))
RETURNS TABLE (
    total_games BIGINT,
    total_bet BIGINT,
    total_win BIGINT,
    win_rate DECIMAL,
    blackjack_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(g.*)::BIGINT as total_games,
        COALESCE(SUM(g.bet_amount), 0)::BIGINT as total_bet,
        COALESCE(SUM(g.payout), 0)::BIGINT as total_win,
        CASE
            WHEN COUNT(g.*) > 0 THEN
                ROUND((COUNT(CASE WHEN g.result IN ('win', 'blackjack') THEN 1 END)::DECIMAL / COUNT(g.*)::DECIMAL) * 100, 2)
            ELSE 0
        END as win_rate,
        COUNT(CASE WHEN g.result = 'blackjack' THEN 1 END)::BIGINT as blackjack_count
    FROM players p
    LEFT JOIN game_sessions gs ON p.id = gs.player_id
    LEFT JOIN games g ON gs.id = g.session_id AND g.result IS NOT NULL
    WHERE p.wallet_address = player_wallet;
END;
$$ LANGUAGE plpgsql;