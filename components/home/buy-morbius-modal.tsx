'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface BuyMorbiusModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MORBIUS_CONTRACT_ADDRESS = '0xB7d4eB5fDfE3d4d3B5C16a44A49948c6EC77c6F1'

export function BuyMorbiusModal({ open, onOpenChange }: BuyMorbiusModalProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(MORBIUS_CONTRACT_ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden text-white" style={{
        background: 'linear-gradient(145deg,rgb(16, 26, 35),rgb(35, 36, 41))',
        boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 1px 3px rgba(0, 0, 0, 0.5)',
        border: '1px inset rgba(60, 60, 60, 0.5)',
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-center text-cyan-400">
            Buy Morbius Token
          </DialogTitle>
        </DialogHeader>

        {/* Contract Address Section */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20">
            <div className="flex-1">
              <div className="text-sm text-cyan-300/80 mb-1">Contract Address</div>
              <div className="text-cyan-400 font-mono text-sm break-all">
                {MORBIUS_CONTRACT_ADDRESS}
              </div>
            </div>
            <Button
              onClick={copyToClipboard}
              className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-medium text-sm rounded transition-colors"
            >
              {copied ? (
                <>
                  <i className="fas fa-check mr-1"></i>
                  Copied!
                </>
              ) : (
                <>
                  <i className="fas fa-copy mr-1"></i>
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Swap Interface Iframe */}
        <div className="flex-1 min-h-[600px] border-t border-white/10">
          <iframe
            src="https://swap.internetmoney.io/"
            className="w-full h-full min-h-[600px] border-0"
            title="Internet Money Swap"
            allow="clipboard-write"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}