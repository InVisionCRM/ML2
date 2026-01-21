'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MULTIPLIERS, SEGMENT_COUNTS, TOTAL_SEGMENTS } from '@/app/BIG-WHEEL/constants';

interface HowToPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HowToPlayModal({ open, onOpenChange }: HowToPlayModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="text-white max-w-lg max-h-[80vh] overflow-y-auto custom-scrollbar"
        style={{
          background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(25, 30, 38))',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-cyan-400">
            How to Play Big Wheel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Introduction */}
          <div className="text-center text-cyan-300/60">
            <p>
              The Big Wheel (also known as Big Six or Money Wheel) is a classic casino game
              where you bet on which symbol the wheel will stop on.
            </p>
          </div>

          {/* Step by Step */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cyan-400">How to Play</h3>

            <div className="space-y-3">
              {[
                { step: 1, title: 'Select Your Chip Size', desc: 'Choose from chip values of 1, 5, 10, 25, 50, or 100 MORBIUS.' },
                { step: 2, title: 'Place Your Bets', desc: 'Click on any betting area (1, 2, 5, 10, 20, Joker, or Morbius) to place your bet. Right-click to remove chips.' },
                { step: 3, title: 'Spin the Wheel', desc: 'Press the SPIN button to set the wheel in motion. Watch as it slows down and lands on a symbol.' },
                { step: 4, title: 'Collect Your Winnings', desc: 'If the wheel stops on a symbol you bet on, you win! Your payout is your bet multiplied by the symbol\'s multiplier.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex gap-3 items-start">
                  <div
                    className="w-8 h-8 rounded-full font-bold flex items-center justify-center flex-shrink-0 text-sm"
                    style={{
                      background: 'linear-gradient(145deg, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))',
                      boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.05)',
                      color: 'rgb(6, 182, 212)',
                    }}
                  >
                    {step}
                  </div>
                  <div>
                    <div className="font-semibold text-cyan-300">{title}</div>
                    <div className="text-sm text-cyan-300/50">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payout Table */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-cyan-400">Payouts & Odds</h3>
            <div
              className="rounded-lg p-3"
              style={{
                background: 'linear-gradient(145deg, rgb(20, 30, 40), rgb(16, 26, 35))',
                boxShadow: 'inset 2px 2px 4px rgba(0, 0, 0, 0.3), inset -2px -2px 4px rgba(255, 255, 255, 0.03)',
              }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-cyan-300/50 border-b border-cyan-300/10">
                    <th className="py-2 text-left">Symbol</th>
                    <th className="py-2 text-center">Payout</th>
                    <th className="py-2 text-center">Segments</th>
                    <th className="py-2 text-right">Odds</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(MULTIPLIERS).map(([symbol, multiplier]) => (
                    <tr key={symbol} className="border-b border-cyan-300/5">
                      <td className="py-2 font-medium text-cyan-300">
                        {symbol === 'JOKER' ? 'Joker' :
                         symbol === 'MORBIUS' ? 'Morbius' : symbol}
                      </td>
                      <td className="py-2 text-center text-cyan-400">{multiplier}:1</td>
                      <td className="py-2 text-center text-cyan-300/70">{SEGMENT_COUNTS[symbol as keyof typeof SEGMENT_COUNTS]}</td>
                      <td className="py-2 text-right text-cyan-300/50">
                        {((SEGMENT_COUNTS[symbol as keyof typeof SEGMENT_COUNTS] / TOTAL_SEGMENTS) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tips */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-cyan-400">Tips</h3>
            <ul className="list-disc list-inside text-sm text-cyan-300/60 space-y-1">
              <li>1 has the highest probability (44.4%) but lowest payout (1:1)</li>
              <li>Joker and Morbius symbols pay 40:1 but appear only once on the wheel</li>
              <li>You can bet on multiple symbols in a single spin</li>
              <li>Connect your wallet to place real bets with MORBIUS or PLS</li>
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
          GOT IT!
        </button>
      </DialogContent>
    </Dialog>
  );
}
