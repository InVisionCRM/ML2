'use client'

import React from 'react';
import { GameResult } from '@/app/BLACKJACK/types';

interface HistoryStripProps {
  history: GameResult[];
}

const HistoryStrip: React.FC<HistoryStripProps> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4">
      <span className="text-xs text-cyan-300/40 flex-shrink-0">Recent:</span>
      {history.slice(0, 10).map((result, index) => {
        const isWin = result.payout > 0n;
        const isBlackjack = result.isBlackjack;

        return (
          <div
            key={result.gameId}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
              ${index === 0 ? 'history-item-enter' : ''}`}
            style={{
              background: isBlackjack
                ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.8), rgba(217, 119, 6, 0.8))'
                : isWin
                ? 'linear-gradient(145deg, rgba(34, 197, 94, 0.8), rgba(22, 163, 74, 0.8))'
                : 'linear-gradient(145deg, rgba(220, 38, 38, 0.8), rgba(185, 28, 28, 0.8))',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              color: 'rgb(16, 26, 35)',
              border: index === 0 ? '1px solid rgba(6, 182, 212, 0.5)' : '1px solid rgba(60, 60, 60, 0.3)',
            }}
            title={`${isBlackjack ? 'Blackjack' : isWin ? 'Win' : 'Loss'} - ${result.playerHand.total}/${result.dealerHand.total}`}
          >
            {isBlackjack ? 'BJ' :
             isWin ? 'W' :
             'L'}
          </div>
        );
      })}
    </div>
  );
};

export default HistoryStrip;