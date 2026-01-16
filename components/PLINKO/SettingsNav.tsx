'use client'

import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface SettingsNavProps {
  balance: number;
  ballCount?: number;
}

export default function SettingsNav({ balance, ballCount }: SettingsNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 right-4 z-50">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="bg-white hover:bg-white/90 border-2 border-green-600 text-green-600 hover:text-green-700"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-cyan-500/30 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white text-center">Settings</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto px-1">
            <div className="py-8 text-center">
              <p className="text-white/60">No settings available</p>
            </div>
          </div>

          {/* Ball Count Display at Bottom */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex justify-center">
              <div className="flex items-center gap-0 px-3 py-1.5 bg-black/40 rounded-full border border-white/20">
                {ballCount !== undefined ? (
                  <>
                    <span className="text-white font-black text-lg px-2 tracking-tight">
                      {ballCount}
                    </span>
                    <span className="text-white/80 text-lg font-black px-1.5">BALLS</span>
                  </>
                ) : (
                  <>
                    <span className="text-white font-black text-lg px-2 tracking-tight">
                      {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-white/80 text-lg font-black px-1.5">USD</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
