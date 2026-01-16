'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const modalStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .modal-enter {
    animation: fadeIn 0.4s ease-out, slideIn 0.4s ease-out;
  }
`;

interface AutoPlaySettings {
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  numberOfRounds: number;
  stopOnLossEnabled: boolean;
  stopOnLossAmount: number;
  stopOnBigWinEnabled: boolean;
  stopOnBigWinAmount: number;
  stopOnProfitEnabled: boolean;
  stopOnProfitAmount: number;
  onLossStrategy: 'reset' | 'increase' | 'decrease';
  onLossPercent: number;
  onWinStrategy: 'reset' | 'increase' | 'decrease';
  onWinPercent: number;
}

interface HighPercentageWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  settings: AutoPlaySettings | null;
}

export default function HighPercentageWarningModal({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  settings
}: HighPercentageWarningModalProps) {

  // Calculate example progression assuming $1000 balance and 10% increase
  const calculateExample = () => {
    if (!settings) return { progression: [], totalWagered: 0, remainingBalance: 1000 };

    const initialBet = 10.00; // 1% of $1000 balance
    let currentBalance = 1000;
    const progression = [{ bet: initialBet, balance: currentBalance, result: 'START' }];

    for (let i = 0; i < 10; i++) {
      const lastEntry = progression[progression.length - 1];
      const currentBet = lastEntry.bet;

      // Simulate alternating wins/losses
      const isWin = i % 2 === 0; // Win on even rounds for variety
      const payoutMultiplier = isWin ? 1.1 : 0; // 10% win or total loss

      // Calculate win/loss amount
      const winAmount = currentBet * payoutMultiplier;
      const netResult = winAmount - currentBet;

      // Update balance
      currentBalance = +(currentBalance + netResult).toFixed(2);

      // Calculate next bet (10% increase regardless of win/loss for this example)
      const nextBet = +(currentBet * 1.10).toFixed(2);

      progression.push({
        bet: nextBet,
        balance: currentBalance,
        result: isWin ? `+$${(winAmount - currentBet).toFixed(2)}` : `-$${currentBet.toFixed(2)}`
      });
    }

    const totalWagered = progression.slice(0, -1).reduce((sum, entry) => sum + entry.bet, 0);

    return {
      progression,
      totalWagered: +totalWagered.toFixed(2),
      remainingBalance: currentBalance
    };
  };

  const exampleData = calculateExample();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: modalStyles }} />
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto modal-enter mx-4"
        style={{
          backgroundImage: `url("/ui/pg4.png")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backgroundBlendMode: 'multiply'
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-bold text-center mb-2">
            ⚠️ HIGH PERCENTAGE WARNING
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Text */}
          <div className="bg-red-900/80 border border-red-500 rounded-lg p-3">
            <p className="text-white text-sm font-semibold text-center mb-1">
              Warning: Setting this higher can lose a significant portion of your funds if you have not set these parameters correctly.
            </p>
            <p className="text-yellow-200 text-center text-sm font-medium">
              If you do not have a real strategy, keep this option set to "Return to initial bet".
            </p>
            <p className="text-green-300 text-center font-bold text-sm mt-1">
              Play Safe. Play Smart.
            </p>
          </div>

          {/* Example Calculation */}
          {settings && (
            <div className="bg-black/60 border border-yellow-500 rounded-lg p-4 animate-in slide-in-from-bottom-4 duration-500 delay-200">
              <h3 className="text-white text-lg font-bold text-center mb-4">
                ⚠️ DANGER EXAMPLE: $1,000 Balance + 10% Increase Each Round
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-white text-sm">
                  <thead>
                    <tr className="border-b border-yellow-500">
                      <th className="text-left py-1 px-2">Round</th>
                      <th className="text-center py-1 px-2">Bet</th>
                      <th className="text-center py-1 px-2">Result</th>
                      <th className="text-center py-1 px-2">Balance</th>
                      <th className="text-center py-1 px-2">Math</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exampleData.progression.slice(0, 6).map((entry, index) => ( // Show only first 6 rounds
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-800/50 transition-colors">
                        <td className="py-2 px-2 font-bold text-xs">
                          {index === 0 ? 'Start' : `R${index}`}
                        </td>
                        <td className="py-2 px-2 text-center text-yellow-400 font-bold text-xs">
                          ${entry.bet.toFixed(2)}
                        </td>
                        <td className={`py-2 px-2 text-center font-bold text-xs ${
                          entry.result.startsWith('+') ? 'text-green-400' :
                          entry.result.startsWith('-') ? 'text-red-400' : 'text-blue-400'
                        }`}>
                          {entry.result}
                        </td>
                        <td className="py-2 px-2 text-center text-cyan-400 font-bold text-xs">
                          ${entry.balance.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-center text-xs text-gray-300">
                          {index === 0 ? 'Initial' :
                           `${exampleData.progression[index-1].bet.toFixed(2)} × 1.10`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="bg-red-900/60 rounded-lg p-2">
                  <div className="text-red-300 font-bold text-sm">Total Wagered</div>
                  <div className="text-white font-bold text-lg">${exampleData.totalWagered.toFixed(2)}</div>
                </div>
                <div className="bg-blue-900/60 rounded-lg p-2">
                  <div className="text-blue-300 font-bold text-sm">Final Balance</div>
                  <div className={`font-bold text-lg ${
                    exampleData.remainingBalance > 1000 ? 'text-green-400' :
                    exampleData.remainingBalance < 1000 ? 'text-red-400' : 'text-white'
                  }`}>
                    ${exampleData.remainingBalance.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-center">
                <div className="text-yellow-400 font-semibold text-sm">
                  10% increases on $1,000 balance over 10 rounds
                </div>
                <div className="text-orange-300 font-medium text-xs mt-1">
                  ⚠️ Results vary based on wins/losses
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white border-gray-500 text-sm"
            >
              Cancel - Go Back
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 py-2 bg-yellow-600 hover:bg-yellow-700 text-black font-bold text-sm"
            >
              I Understand - Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
