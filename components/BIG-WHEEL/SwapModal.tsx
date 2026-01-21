'use client'

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SwapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SwapModal({ open, onOpenChange }: SwapModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-cyan-400">
            Buy MORBIUS
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-center text-gray-300 text-sm">
            Get MORBIUS tokens to play Big Wheel and other games on Morbius.io
          </p>

          {/* PulseX Link */}
          <a
            href="https://app.pulsex.com/swap?outputCurrency=0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-center font-bold transition-all active:scale-95"
          >
            <div className="flex items-center justify-center gap-2">
              <span>Swap on PulseX</span>
              <i className="fas fa-external-link-alt text-sm"></i>
            </div>
          </a>

          {/* Token Info */}
          <div className="bg-black/50 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-2">MORBIUS Token Address</div>
            <div className="font-mono text-xs text-cyan-400 break-all">
              0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1
            </div>
          </div>

          <p className="text-center text-gray-500 text-xs">
            Always verify the token address before swapping
          </p>
        </div>

        <button
          onClick={() => onOpenChange(false)}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
        >
          Close
        </button>
      </DialogContent>
    </Dialog>
  );
}
