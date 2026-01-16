import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DisclaimerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisclaimerModal({ open, onOpenChange }: DisclaimerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-950 to-slate-900/95 border-white/20 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-4">
            <DialogTitle className="text-2xl font-bold mb-2 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              ⚠️ Important Disclaimer
            </DialogTitle>
            <div className="w-16 h-0.5 bg-gradient-to-r from-red-400 to-orange-400 mx-auto"></div>
          </div>
        </DialogHeader>

        <div className="space-y-6 text-sm leading-relaxed">
          <div className="bg-red-950/20 p-4 rounded-lg border border-red-400/20">
            <p className="text-red-300 font-semibold text-center mb-3">
              Please read this disclaimer carefully before using our platform.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 p-4 rounded border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                🎭 Entertainment Only
              </h3>
              <p className="text-white/70">
                This website is created purely for entertainment purposes. All games and activities on this platform are designed for amusement and should not be considered as investment opportunities or financial advice.
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                💰 No Profit Expectations
              </h3>
              <p className="text-white/70">
                Users participating in our games are sacrificing their Morbius tokens for entertainment value only. There are no guarantees of profit, returns, or financial gain. All tokens used in games may be lost permanently.
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                🛡️ Proof of Concept
              </h3>
              <p className="text-white/70">
                This platform is a proof of concept and experimental technology. It may contain bugs, experience downtime, or undergo significant changes without notice.
              </p>
            </div>

            <div className="bg-red-950/20 p-4 rounded border border-red-400/20">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                ⚖️ No Liability
              </h3>
              <p className="text-red-200 font-medium">
                MorbiusEnterprisesLLC and its affiliates shall not be held liable for any losses, damages, or issues arising from the use of this platform. This includes but is not limited to:
              </p>
              <ul className="text-red-300 mt-2 space-y-1 ml-4">
                <li>• Loss of tokens or digital assets</li>
                <li>• Technical failures or downtime</li>
                <li>• Smart contract vulnerabilities</li>
                <li>• Regulatory or legal issues</li>
                <li>• Any financial losses or expectations</li>
              </ul>
            </div>

            <div className="bg-yellow-950/20 p-4 rounded border border-yellow-400/20">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                🎲 Gambling Warning
              </h3>
              <p className="text-yellow-200">
                Gambling involves risk. Only gamble with money you can afford to lose. If you have concerns about gambling addiction, please seek professional help.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-950/20 to-pink-950/20 p-4 rounded border border-purple-400/20">
            <p className="text-purple-200 text-center font-medium">
              By continuing to use this platform, you acknowledge that you have read, understood, and agree to this disclaimer.
            </p>
          </div>

          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs">
              This site is owned and operated by Sweepsteaks Limited by MorbiusEnterprisesLLC
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}