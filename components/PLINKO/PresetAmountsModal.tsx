'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PresetAmountsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAmount: (amount: number) => void;
}

const PRESET_AMOUNTS = [
  0.10, 0.20,
  0.30, 0.40,
  0.50, 0.60,
  0.70, 0.80,
  1, 2,
  5, 10,
  20, 50,
  100
];

export default function PresetAmountsModal({
  open,
  onOpenChange,
  onSelectAmount
}: PresetAmountsModalProps) {
  const handleSelectAmount = (amount: number) => {
    onSelectAmount(amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[300px] bg-gradient-to-b from-white via-blue-500 to-blue-700 border-2 border-blue-600">
        <DialogHeader>
          <DialogTitle className="text-md font-bold text-blue-600 text-center">Bet USD</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 p-2">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              onClick={() => handleSelectAmount(amount)}
              className="text-xs bg-gradient-to-b from-green-600 to-green-700 shadow-lg shadow-black/60 hover:from-green-500 hover:to-green-600 text-white font-bold py-1 px-2 rounded-lg active:scale-95 transition-all"
            >
              {amount.toFixed(2)}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
