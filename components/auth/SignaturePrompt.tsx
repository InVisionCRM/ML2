import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Shield, DollarSign } from 'lucide-react'

interface SignaturePromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<boolean>
  onCancel: () => void
  isSigning: boolean
  title: string
  description: string
  action: string
  amount?: string
  risk?: 'low' | 'medium' | 'high'
}

export function SignaturePrompt({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  isSigning,
  title,
  description,
  action,
  amount,
  risk = 'medium'
}: SignaturePromptProps) {
  const handleConfirm = async () => {
    const success = await onConfirm()
    if (success) {
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const getRiskColor = () => {
    switch (risk) {
      case 'low': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'high': return 'text-red-400'
      default: return 'text-yellow-400'
    }
  }

  const getRiskIcon = () => {
    switch (risk) {
      case 'low': return <Shield className="w-5 h-5 text-green-400" />
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'high': return <AlertTriangle className="w-5 h-5 text-red-400" />
      default: return <AlertTriangle className="w-5 h-5 text-yellow-400" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/20 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center mb-2 flex items-center justify-center gap-2">
            {getRiskIcon()}
            {title}
          </DialogTitle>
          <DialogDescription className="text-white/70 text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Display */}
          {amount && (
            <div className="bg-white/5 p-4 rounded border border-white/10 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                <span className="text-lg font-bold text-cyan-400">{amount}</span>
              </div>
              <p className="text-sm text-white/60">Transaction Amount</p>
            </div>
          )}

          {/* Risk Level */}
          <div className={`bg-white/5 p-3 rounded border border-white/10`}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-white/70">Risk Level:</span>
              <span className={`font-semibold capitalize ${getRiskColor()}`}>
                {risk}
              </span>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-950/20 p-4 rounded border border-blue-400/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-300 mb-1">Cryptographic Confirmation</h4>
                <p className="text-sm text-blue-200">
                  This action requires your digital signature to confirm your identity and prevent unauthorized transactions.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              disabled={isSigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSigning}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold"
            >
              {isSigning ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Signing...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  {action}
                </>
              )}
            </Button>
          </div>

          {/* Footer Note */}
          <p className="text-xs text-white/50 text-center">
            Your signature is cryptographically secure and cannot be forged.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}