'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RiskLevel } from '@/app/PLINKO/types';

interface HistoryItem {
  id: number;
  multiplier: number;
  risk: RiskLevel;
}

interface ExtendedHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryItem[];
}

export default function ExtendedHistoryModal({
  open,
  onOpenChange,
  history
}: ExtendedHistoryModalProps) {
  // Function to determine color based on risk level and multiplier (matches history display)
  const getMultiplierColor = (item: HistoryItem) => {
    const isDark = item.multiplier < 1;

    if (item.risk === 'GREEN') {
      return isDark ? 'bg-[rgb(100,140,45)]' : 'bg-[rgb(140,185,60)]';
    } else if (item.risk === 'YELLOW') {
      return isDark ? 'bg-[rgb(20,100,200)]' : 'bg-[rgb(30,144,255)]';
    } else if (item.risk === 'RED') {
      return isDark ? 'bg-[rgb(160,35,35)]' : 'bg-[rgb(210,50,50)]';
    }
    return 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[280px] border-2 border-white p-2 z-[100]"
        style={{
          backgroundImage: `url("/ui/pg3.png")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xs font-bold text-white uppercase tracking-wide text-center">All Results</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[400px] pr-1 custom-scrollbar">
          <div className="grid grid-cols-4 gap-1.5">
            {history.length > 0 ? history.map((item) => (
              <div
                key={item.id}
                className={`${getMultiplierColor(item)} rounded-sm px-0 py-0 text-center font-black text-lg shadow-[0_2px_4px_rgba(0,0,0,0.3)] border border-white/40 text-white transition-transform hover:scale-105`}
              >
                {item.multiplier}
              </div>
            )) : (
              <div className="col-span-4 text-center text-white py-4 text-sm">
                No results yet
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
