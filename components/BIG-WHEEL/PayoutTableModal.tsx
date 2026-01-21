'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MULTIPLIERS, SEGMENT_COUNTS, TOTAL_SEGMENTS } from '@/app/BIG-WHEEL/constants';
import { BetType } from '@/app/BIG-WHEEL/types';

interface PayoutTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BET_TYPES: BetType[] = ['1', '2', '5', '10', '20', 'JOKER', 'MORBIUS'];

export default function PayoutTableModal({ open, onOpenChange }: PayoutTableModalProps) {
  const calculateHouseEdge = (type: BetType): number => {
    const segments = SEGMENT_COUNTS[type];
    const probability = segments / TOTAL_SEGMENTS;
    const payout = MULTIPLIERS[type];
    const expectedValue = probability * (payout + 1);
    const houseEdge = (1 - expectedValue) * 100;
    return houseEdge;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="text-white max-w-lg max-h-[85vh] overflow-y-auto custom-scrollbar"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(25, 30, 38))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-cyan-400">
            Payout Table
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Visual wheel breakdown */}
          <div className="text-center text-sm text-cyan-300/50 mb-4">
            The Big Wheel has {TOTAL_SEGMENTS} segments in total
          </div>

          {/* Detailed payout cards */}
          <div className="space-y-3">
            {BET_TYPES.map((type) => {
              const multiplier = MULTIPLIERS[type];
              const segments = SEGMENT_COUNTS[type];
              const probability = ((segments / TOTAL_SEGMENTS) * 100).toFixed(2);
              const houseEdge = calculateHouseEdge(type).toFixed(2);
              const isHighValue = multiplier >= 10;

              return (
                <div
                  key={type}
                  className="rounded-xl p-4"
                  style={{
                    background: isHighValue
                      ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.1), rgba(8, 145, 178, 0.1))'
                      : 'linear-gradient(145deg, rgb(25, 35, 45), rgb(20, 30, 40))',
                    boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
                    border: isHighValue ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(60, 60, 60, 0.3)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Symbol */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
                        style={{
                          background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
                          boxShadow: 'inset 3px 3px 6px rgba(0, 0, 0, 0.3), inset -3px -3px 6px rgba(255, 255, 255, 0.03)',
                          color: isHighValue ? 'rgb(6, 182, 212)' : 'rgba(6, 182, 212, 0.7)',
                        }}
                      >
                        {type === 'JOKER' ? 'J' : type === 'MORBIUS' ? 'M' : type}
                      </div>
                      <div>
                        <div className="font-bold text-cyan-300">
                          {type === 'JOKER' ? 'Joker' : type === 'MORBIUS' ? 'Morbius' : type}
                        </div>
                        <div className="text-xs text-cyan-300/50">
                          {segments} segment{segments > 1 ? 's' : ''} on wheel
                        </div>
                      </div>
                    </div>

                    {/* Payout */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-cyan-400">
                        {multiplier}:1
                      </div>
                      <div className="text-xs text-cyan-300/50">
                        payout
                      </div>
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="mt-3 pt-3 border-t border-cyan-300/10 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-xs text-cyan-300/40 uppercase">Win Chance</div>
                      <div className="text-lg font-semibold text-cyan-400">{probability}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-cyan-300/40 uppercase">House Edge</div>
                      <div className="text-lg font-semibold text-red-400/80">{houseEdge}%</div>
                    </div>
                  </div>

                  {/* Visual probability bar */}
                  <div
                    className="mt-2 h-2 rounded-full overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, rgb(20, 30, 40), rgb(16, 26, 35))',
                      boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${probability}%`,
                        background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.5), rgba(6, 182, 212, 0.8))',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div
            className="rounded-xl p-4 mt-4"
            style={{
              background: 'linear-gradient(145deg, rgb(20, 30, 40), rgb(16, 26, 35))',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
            }}
          >
            <h4 className="text-sm font-bold text-cyan-400 mb-2">How Payouts Work</h4>
            <ul className="text-xs text-cyan-300/60 space-y-1">
              <li>• <strong className="text-cyan-300/80">1:1 payout</strong> means you win your bet amount (bet 10, win 10, total 20)</li>
              <li>• <strong className="text-cyan-300/80">40:1 payout</strong> means you win 40x your bet (bet 10, win 400, total 410)</li>
              <li>• Bets are returned on a win, so total return = bet + (bet × multiplier)</li>
              <li>• Multiple bets can be placed on a single spin</li>
            </ul>
          </div>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full py-3 rounded-lg font-bold transition-all active:scale-95 text-cyan-300"
          style={{
            background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2))',
            boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.3), inset -4px -4px 8px rgba(255, 255, 255, 0.05)',
          }}
        >
          CLOSE
        </button>
      </DialogContent>
    </Dialog>
  );
}
