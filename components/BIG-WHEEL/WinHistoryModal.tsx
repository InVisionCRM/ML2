'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SpinResult } from '@/app/BIG-WHEEL/types';
import { MULTIPLIERS } from '@/app/BIG-WHEEL/constants';

interface WinHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: SpinResult[];
  onClearHistory?: () => void;
}

export default function WinHistoryModal({
  open,
  onOpenChange,
  history,
  onClearHistory,
}: WinHistoryModalProps) {
  const totalWagered = history.reduce((sum, h) => sum + h.totalBet, 0);
  const totalWon = history.reduce((sum, h) => sum + h.totalWin, 0);
  const netProfit = totalWon - totalWagered;

  const winCount = history.filter(h => h.totalWin > 0).length;
  const winRate = history.length > 0 ? ((winCount / history.length) * 100).toFixed(1) : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="text-white max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(25, 30, 38))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-cyan-400">
            Spin History
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 custom-scrollbar">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-lg p-3 text-center"
              style={{
                background: 'linear-gradient(145deg, rgb(25, 35, 45), rgb(20, 30, 40))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              }}
            >
              <div className="text-xs text-cyan-300/50 uppercase">Total Spins</div>
              <div className="text-xl font-bold text-cyan-300">{history.length}</div>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{
                background: 'linear-gradient(145deg, rgb(25, 35, 45), rgb(20, 30, 40))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              }}
            >
              <div className="text-xs text-cyan-300/50 uppercase">Win Rate</div>
              <div className="text-xl font-bold text-cyan-400">{winRate}%</div>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{
                background: 'linear-gradient(145deg, rgb(25, 35, 45), rgb(20, 30, 40))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              }}
            >
              <div className="text-xs text-cyan-300/50 uppercase">Total Wagered</div>
              <div className="text-xl font-bold text-cyan-300">{totalWagered.toLocaleString()}</div>
            </div>
            <div
              className="rounded-lg p-3 text-center"
              style={{
                background: 'linear-gradient(145deg, rgb(25, 35, 45), rgb(20, 30, 40))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              }}
            >
              <div className="text-xs text-cyan-300/50 uppercase">Net Profit</div>
              <div className={`text-xl font-bold ${netProfit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}
              </div>
            </div>
          </div>

          {/* History List */}
          {history.length === 0 ? (
            <div className="text-center py-8 text-cyan-300/40">
              <i className="fas fa-history text-4xl mb-3 opacity-50"></i>
              <p>No spins yet</p>
              <p className="text-sm">Your spin history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((result, index) => {
                const isWin = result.totalWin > 0;
                const profit = result.totalWin - result.totalBet;
                const timeAgo = getTimeAgo(result.timestamp);
                const isHighValue = result.segment.multiplier >= 10;

                return (
                  <div
                    key={result.id}
                    className={`rounded-lg p-3 ${index === 0 ? 'history-item-enter' : ''}`}
                    style={{
                      background: isWin
                        ? 'linear-gradient(145deg, rgba(6, 182, 212, 0.1), rgba(8, 145, 178, 0.1))'
                        : 'linear-gradient(145deg, rgb(25, 35, 45), rgb(20, 30, 40))',
                      boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
                      border: isWin ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid rgba(60, 60, 60, 0.2)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Result */}
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{
                            background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
                            boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
                            color: isHighValue ? 'rgb(6, 182, 212)' : 'rgba(6, 182, 212, 0.7)',
                          }}
                        >
                          {result.segment.value === 'JOKER' ? 'J' :
                           result.segment.value === 'MORBIUS' ? 'M' :
                           result.segment.value}
                        </div>
                        <div>
                          <div className="font-semibold text-cyan-300">
                            {result.segment.multiplier}x Multiplier
                          </div>
                          <div className="text-xs text-cyan-300/50">
                            Bet: {result.totalBet.toLocaleString()} MORBIUS
                          </div>
                        </div>
                      </div>

                      {/* Profit/Loss */}
                      <div className="text-right">
                        <div className={`font-bold ${profit >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                        </div>
                        <div className="text-xs text-cyan-300/40">{timeAgo}</div>
                      </div>
                    </div>

                    {/* Transaction hash if available */}
                    {result.txHash && (
                      <div className="mt-2 pt-2 border-t border-cyan-300/10">
                        <a
                          href={`https://scan.pulsechain.com/tx/${result.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1"
                        >
                          <span className="truncate">{result.txHash.slice(0, 16)}...{result.txHash.slice(-8)}</span>
                          <i className="fas fa-external-link-alt text-[10px]"></i>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 pt-4 border-t border-cyan-300/10">
          {history.length > 0 && onClearHistory && (
            <button
              onClick={onClearHistory}
              className="flex-1 py-2 rounded-lg font-medium transition-all text-sm text-cyan-300/60 hover:text-cyan-300"
              style={{
                background: 'linear-gradient(145deg, rgb(35, 45, 55), rgb(25, 35, 45))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              }}
            >
              Clear History
            </button>
          )}
          <button
            onClick={() => onOpenChange(false)}
            className={`${history.length > 0 && onClearHistory ? 'flex-1' : 'w-full'} py-2 rounded-lg font-medium transition-all text-cyan-300`}
            style={{
              background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2))',
              boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
            }}
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
