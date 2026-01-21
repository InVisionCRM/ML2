'use client';

import React, { useState, useEffect } from 'react';
import { formatEther, parseEther } from 'viem';
import { useTokenBalance } from '@/hooks/use-token';
import { useNativeBalance } from '@/hooks/use-native-balance';
import { usePlsQuote } from '@/hooks/use-pls-quote';
import { MORBIUS_TOKEN_ADDRESS } from '@/lib/contracts';
import { BET_LIMITS } from '@/app/BLACKJACK/constants';

interface BettingPanelProps {
  onStartGame: (betAmount: bigint, clientSeed: string) => void; // Removed usePLS since only MORBIUS from reserve
  isPlaying: boolean;
  reserveBalance: bigint;
  onBetAmountChange?: (betAmount: bigint) => void;
}

const BettingPanel: React.FC<BettingPanelProps> = ({
  onStartGame,
  isPlaying,
  reserveBalance,
  onBetAmountChange
}) => {
  const [betAmount, setBetAmount] = useState<string>('0');
  const [clientSeed, setClientSeed] = useState('');

  const betAmountBigInt = parseEther(betAmount || '0');

  // Notify parent component of bet amount changes
  useEffect(() => {
    if (onBetAmountChange) {
      onBetAmountChange(betAmountBigInt);
    }
  }, [betAmountBigInt, onBetAmountChange]);

  const isValidBet = betAmountBigInt >= BET_LIMITS.MIN_BET && betAmountBigInt <= BET_LIMITS.MAX_BET;
  const hasEnoughBalance = reserveBalance >= betAmountBigInt;

  console.log('BettingPanel validation:', {
    betAmount,
    betAmountBigInt: betAmountBigInt.toString(),
    BET_LIMITS_MIN: BET_LIMITS.MIN_BET.toString(),
    BET_LIMITS_MAX: BET_LIMITS.MAX_BET.toString(),
    isValidBet,
    hasEnoughBalance,
    clientSeed: !!clientSeed
  });

  // plsEquivalent is now provided directly from the hook

  // Generate random client seed
  const generateClientSeed = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const seed = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    setClientSeed(seed);
    return seed;
  };

  const handleStartGame = () => {
    console.log('BettingPanel handleStartGame called', {
      isValidBet,
      hasEnoughBalance,
      clientSeed,
      betAmount,
      betAmountBigInt
    });

    if (!isValidBet || !hasEnoughBalance || !clientSeed) {
      console.log('Bet validation failed:', { isValidBet, hasEnoughBalance, clientSeed });
      return;
    }

    const finalSeed = clientSeed || generateClientSeed();
    console.log('Calling onStartGame with:', { betAmountBigInt, finalSeed });
    onStartGame(betAmountBigInt, finalSeed);
  };

  const quickBetAmounts = [1, 5, 10, 25, 50, 100];

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(35, 36, 41))',
          boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(60, 60, 60, 0.5)',
        }}
      >
        <div className="text-xs text-cyan-300/60 mb-2 text-center font-bold uppercase tracking-wider">Place Your Bet</div>


      {/* Reserve-based betting info */}
      <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
        <div className="text-xs text-purple-300 text-center font-medium">
          Bets are placed from your MORBIUS reserve
        </div>
      </div>

      {/* Bet amount input */}
      <div className="mb-6">
        <div className="text-xs text-cyan-300/60 mb-3 text-center font-bold uppercase tracking-wider">Bet Amount</div>
        <div className="flex items-center justify-center mb-3">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow whole numbers
              if (value === '' || /^\d+$/.test(value)) {
                setBetAmount(value);
              }
            }}
            className="px-3 py-2 text-center font-bold text-cyan-300 rounded border focus:outline-none"
            style={{
              background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(60, 60, 60, 0.3)',
              width: '120px',
            }}
            placeholder="0"
            min={Math.floor(Number(formatEther(BET_LIMITS.MIN_BET)))}
            max={Math.floor(Number(formatEther(BET_LIMITS.MAX_BET)))}
            step="1"
            onBlur={(e) => {
              // Ensure whole numbers only
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 0) {
                setBetAmount(value.toString());
              } else {
                setBetAmount('0');
              }
            }}
            disabled={isPlaying}
          />
        </div>

        {/* Quick bet buttons */}
        <div className="flex justify-center gap-2 flex-wrap">
          {quickBetAmounts.map(amount => (
            <button
              key={amount}
              onClick={() => setBetAmount(amount.toString())}
              disabled={isPlaying}
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
                color: 'rgba(6, 182, 212, 0.5)',
                border: '1px solid rgba(60, 60, 60, 0.3)',
              }}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      {/* Reserve balance information */}
      {betAmountBigInt > 0n && (
        <div className="mb-6 p-3 rounded-lg text-center"
          style={{
            background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.1), rgba(79, 70, 229, 0.1))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
          }}
        >
          <div className="text-purple-300/80 text-sm">
            Reserve Balance: {Math.floor(Number(formatEther(reserveBalance)))} MORBIUS
          </div>
        </div>
      )}

      {/* Client seed */}
      <div className="mb-6">
        <div className="text-xs text-cyan-300/60 mb-3 text-center font-bold uppercase tracking-wider">Provably Fair Seed</div>
        <div className="mb-2">
          <input
            type="text"
            value={clientSeed}
            onChange={(e) => setClientSeed(e.target.value)}
            className="w-full px-3 py-2 text-center font-mono text-cyan-300 rounded border focus:outline-none"
            style={{
              background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(60, 60, 60, 0.3)',
            }}
            placeholder="Your random seed"
            disabled={isPlaying}
          />
        </div>
        <div className="mb-2">
          <button
            onClick={generateClientSeed}
            disabled={isPlaying}
            className="w-full px-4 py-2 rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
              boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05)',
              color: 'rgb(6, 182, 212)',
              border: '2px solid rgba(6, 182, 212, 0.5)',
            }}
          >
            Generate Random Seed
          </button>
        </div>
        <p className="text-[10px] text-cyan-300/40 text-center">
          Used for provably fair card shuffling
        </p>
      </div>

      {/* Validation messages */}
      {!isValidBet && betAmount && (
        <div className="mb-4 text-red-400 text-sm text-center">
          Bet must be between {Math.floor(Number(formatEther(BET_LIMITS.MIN_BET)))} and {Math.floor(Number(formatEther(BET_LIMITS.MAX_BET)))}
        </div>
      )}

      {!hasEnoughBalance && betAmount && (
        <div className="mb-4 text-red-400 text-sm text-center">
          Insufficient balance
        </div>
      )}

      {!clientSeed && (
        <div className="mb-4 text-yellow-400 text-sm text-center">
          Please provide a client seed for provably fair gameplay
        </div>
      )}

      {/* Start game button */}
      <button
        onClick={handleStartGame}
        disabled={isPlaying || !isValidBet || !hasEnoughBalance || !clientSeed}
        className={`w-full py-3 px-6 rounded-lg font-bold text-lg transition-all
          ${isPlaying || !isValidBet || !hasEnoughBalance || !clientSeed
            ? 'opacity-50 cursor-not-allowed text-cyan-300/30'
            : 'text-cyan-300 active:scale-95'}
        `}
        style={{
          background: isPlaying || !isValidBet || !hasEnoughBalance || !clientSeed
            ? 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))'
            : 'linear-gradient(145deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
          boxShadow: isPlaying || !isValidBet || !hasEnoughBalance || !clientSeed
            ? 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)'
            : 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05), 0 4px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        {isPlaying ? 'GAME IN PROGRESS...' : '🃏 DEAL CARDS'}
      </button>

      </div>
    </div>
  );
};

export default BettingPanel;