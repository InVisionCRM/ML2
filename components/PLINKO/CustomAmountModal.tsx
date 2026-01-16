'use client'

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CustomAmountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSetAmount: (amount: number) => void;
  currentAmount: number;
}

export default function CustomAmountModal({
  open,
  onOpenChange,
  onSetAmount,
  currentAmount
}: CustomAmountModalProps) {
  const [displayValue, setDisplayValue] = useState(currentAmount.toFixed(2));

  const handleNumberClick = (num: string) => {
    if (displayValue === '0.00') {
      setDisplayValue(num === '.' ? '0.' : num);
    } else if (num === '.') {
      if (!displayValue.includes('.')) {
        setDisplayValue(displayValue + '.');
      }
    } else {
      setDisplayValue(displayValue + num);
    }
  };

  const handleClear = () => {
    setDisplayValue('0.00');
  };

  const handleBackspace = () => {
    if (displayValue.length > 1) {
      setDisplayValue(displayValue.slice(0, -1));
    } else {
      setDisplayValue('0.00');
    }
  };

  const handleConfirm = () => {
    const amount = parseFloat(displayValue);
    if (!isNaN(amount) && amount >= 0.1) {
      onSetAmount(amount);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-2 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white text-center">Enter Bet Amount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Display */}
          <div className="bg-black/40 rounded-lg p-4 border-2 border-gray-600">
            <div className="text-white/60 text-sm font-medium uppercase text-center mb-1">Bet USD</div>
            <div className="text-white font-bold text-4xl font-mono text-center">{displayValue}</div>
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num)}
                className="h-14 rounded-lg bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 text-white font-bold text-xl shadow-lg border-b-4 border-slate-800 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 active:scale-95 transition-all duration-75"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 rounded-lg bg-gradient-to-b from-red-600 via-red-500 to-red-700 text-white font-bold text-sm shadow-lg border-b-4 border-red-800 hover:from-red-500 hover:via-red-400 hover:to-red-600 active:scale-95 transition-all duration-75"
            >
              CLEAR
            </button>
            <button
              onClick={() => handleNumberClick('0')}
              className="h-14 rounded-lg bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 text-white font-bold text-xl shadow-lg border-b-4 border-slate-800 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 active:scale-95 transition-all duration-75"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-14 rounded-lg bg-gradient-to-b from-yellow-600 via-yellow-500 to-yellow-700 text-white font-bold text-sm shadow-lg border-b-4 border-yellow-800 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-600 active:scale-95 transition-all duration-75 flex items-center justify-center"
            >
              <i className="fas fa-backspace"></i>
            </button>
          </div>

          {/* Decimal Point */}
          <button
            onClick={() => handleNumberClick('.')}
            className="w-full h-12 rounded-lg bg-gradient-to-b from-slate-700 via-slate-600 to-slate-700 text-white font-bold text-xl shadow-lg border-b-4 border-slate-800 hover:from-slate-600 hover:via-slate-500 hover:to-slate-600 active:scale-95 transition-all duration-75"
          >
            .
          </button>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            className="w-full h-14 rounded-lg bg-gradient-to-b from-green-500 via-green-600 to-green-700 text-white font-bold text-lg shadow-lg border-b-4 border-green-800 hover:from-green-400 hover:via-green-500 hover:to-green-600 active:scale-95 transition-all duration-75 uppercase tracking-wider"
          >
            Confirm
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
