'use client'

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { BetType, Bet, ChipSize } from '@/app/BIG-WHEEL/types';
import { MULTIPLIERS, SEGMENT_COUNTS, CHIP_VALUES, TOTAL_SEGMENTS, BET_LIMITS } from '@/app/BIG-WHEEL/constants';

interface BettingPanelProps {
  bets: Bet[];
  onBetChange: (bets: Bet[]) => void;
  balance: number;
  isSpinning: boolean;
  onSpin: () => void;
  onClearBets: () => void;
  totalBet: number;
}

const BET_TYPES: BetType[] = ['1', '2', '5', '10', '20', 'JOKER', 'MORBIUS'];

const formatChipValue = (value: number): string => {
  if (value === 1000) return '1k';
  if (value === 2000) return '2k';
  if (value === 5555) return '5,555';
  if (value === 10000) return '10k';
  return value.toString();
};

export default function BettingPanel({
  bets,
  onBetChange,
  balance,
  isSpinning,
  onSpin,
  onClearBets,
  totalBet,
}: BettingPanelProps) {
  const [selectedChip, setSelectedChip] = useState<ChipSize>(1000);

  const getBetAmount = useCallback((type: BetType): number => {
    const bet = bets.find(b => b.type === type);
    return bet?.amount || 0;
  }, [bets]);

  const placeBet = useCallback((type: BetType) => {
    if (isSpinning) return;
    if (selectedChip > balance) {
      toast.error(`Insufficient balance! Need ${formatChipValue(selectedChip)} but only have ${formatChipValue(balance)}`);
      return;
    }
    if (selectedChip > BET_LIMITS.MAX_TOTAL_BET) return;

    const existingBetIndex = bets.findIndex(b => b.type === type);
    let newBets: Bet[];

    if (existingBetIndex >= 0) {
      // Adding to existing bet on same type
      const newAmount = bets[existingBetIndex].amount + selectedChip;
      if (newAmount > BET_LIMITS.MAX_BET) return;
      newBets = [...bets];
      newBets[existingBetIndex] = { ...newBets[existingBetIndex], amount: newAmount };
    } else {
      // New bet on different type - replace all existing bets with this single bet
      newBets = [{ type, amount: selectedChip }];
    }

    onBetChange(newBets);
  }, [bets, onBetChange, selectedChip, isSpinning, balance]);

  const removeBet = useCallback((type: BetType) => {
    if (isSpinning) return;

    const existingBetIndex = bets.findIndex(b => b.type === type);
    if (existingBetIndex < 0) return;

    const currentAmount = bets[existingBetIndex].amount;
    let newBets: Bet[];

    if (currentAmount <= selectedChip) {
      newBets = bets.filter(b => b.type !== type);
    } else {
      newBets = [...bets];
      newBets[existingBetIndex] = { ...newBets[existingBetIndex], amount: currentAmount - selectedChip };
    }

    onBetChange(newBets);
  }, [bets, onBetChange, selectedChip, isSpinning]);

  const canSpin = totalBet > 0 && !isSpinning && totalBet <= balance;

  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Chip Selection */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(35, 36, 41))',
          boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(60, 60, 60, 0.5)',
        }}
      >
        <div className="text-xs text-cyan-300/60 mb-2 text-center font-bold uppercase tracking-wider">Select Chip</div>
        <div className="flex justify-center gap-2 flex-wrap">
          {CHIP_VALUES.map((value) => (
            <button
              key={value}
              onClick={() => setSelectedChip(value)}
              disabled={isSpinning}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm transition-all
                ${isSpinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
              `}
              style={{
                background: selectedChip === value
                  ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))'
                  : 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
                boxShadow: selectedChip === value
                  ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05), 0 0 15px rgba(6, 182, 212, 0.4)'
                  : 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
                color: selectedChip === value ? 'rgb(6, 182, 212)' : 'rgba(6, 182, 212, 0.5)',
                border: selectedChip === value ? '2px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(60, 60, 60, 0.3)',
              }}
            >
              {formatChipValue(value)}
            </button>
          ))}
        </div>
      </div>

      {/* Betting Areas */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(35, 36, 41))',
          boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(60, 60, 60, 0.5)',
        }}
      >
        <div className="text-xs text-cyan-300/60 mb-3 text-center font-bold uppercase tracking-wider">Place Your Bets</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {BET_TYPES.map((type) => {
            const betAmount = getBetAmount(type);
            const probability = ((SEGMENT_COUNTS[type] / TOTAL_SEGMENTS) * 100).toFixed(1);
            const isHighValue = MULTIPLIERS[type] >= 10;

            return (
              <div
                key={type}
                onClick={() => placeBet(type)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  removeBet(type);
                }}
                className={`relative rounded-lg p-2 text-center cursor-pointer transition-all
                  ${isSpinning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
                `}
                style={{
                  background: betAmount > 0
                    ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2))'
                    : isHighValue
                    ? 'linear-gradient(145deg, rgba(45, 55, 65, 1), rgba(35, 45, 55, 1))'
                    : 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
                  boxShadow: betAmount > 0
                    ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05), 0 0 10px rgba(6, 182, 212, 0.3)'
                    : 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
                  border: betAmount > 0 ? '2px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(60, 60, 60, 0.3)',
                }}
              >
                {/* Symbol/Value */}
                <div className={`text-lg font-bold ${betAmount > 0 ? 'text-cyan-300' : isHighValue ? 'text-cyan-400/80' : 'text-cyan-300/60'}`}>
                  {type === 'JOKER' ? 'J' : type === 'MORBIUS' ? 'M' : type}
                </div>

                {/* Multiplier */}
                <div className={`text-xs font-medium ${betAmount > 0 ? 'text-cyan-300/80' : 'text-cyan-300/40'}`}>
                  {MULTIPLIERS[type]}:1
                </div>

                {/* Probability */}
                <div className="text-[10px] text-cyan-300/30">
                  {probability}%
                </div>

                {/* Bet Amount Badge */}
                {betAmount > 0 && (
                  <div
                    className="absolute -top-2 -right-2 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center chip-stack-enter"
                    style={{
                      background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.8), rgba(8, 145, 178, 0.8))',
                      color: 'rgb(16, 26, 35)',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {formatChipValue(betAmount)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bet hint */}
        <div className="text-[10px] text-cyan-300/30 text-center mt-2">
          Left-click to add bet, right-click to remove
        </div>
      </div>

      {/* Bet Summary & Controls */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(35, 36, 41))',
          boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(60, 60, 60, 0.5)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-cyan-300/60 font-bold uppercase tracking-wider">Total Bet</div>
            <div className="text-xl font-bold text-cyan-300">{totalBet.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-cyan-300/60 font-bold uppercase tracking-wider">Balance</div>
            <div className="text-xl font-bold text-cyan-400">{balance.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClearBets}
            disabled={isSpinning || totalBet === 0}
            className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all
              ${isSpinning || totalBet === 0
                ? 'opacity-50 cursor-not-allowed text-cyan-300/30'
                : 'text-cyan-300/80 hover:text-cyan-300 active:scale-95'}
            `}
            style={{
              background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
            }}
          >
            CLEAR
          </button>
          <button
            onClick={onSpin}
            disabled={!canSpin}
            className={`flex-[2] py-3 rounded-lg font-bold text-lg transition-all
              ${!canSpin
                ? 'opacity-50 cursor-not-allowed text-cyan-300/30'
                : 'text-cyan-300 active:scale-95 spin-button-ready'}
            `}
            style={{
              background: canSpin
                ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))'
                : 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
              boxShadow: canSpin
                ? 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05), 0 4px 12px rgba(0, 0, 0, 0.2)'
                : 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
            }}
          >
            {isSpinning ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-spinner fa-spin"></i>
                SPINNING...
              </span>
            ) : (
              'SPIN'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
