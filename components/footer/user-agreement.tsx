import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserAgreementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserAgreementModal({ open, onOpenChange }: UserAgreementModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/20 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            User Agreement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Last updated: January 2026</strong>
          </p>

          <p>
            This User Agreement outlines the terms under which you may use Morbius.io and participate in our blockchain gaming platform.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Eligibility</h3>
          <ul className="space-y-1 ml-4">
            <li>• You must be at least 18 years old</li>
            <li>• You must have a compatible Web3 wallet</li>
            <li>• You must comply with local laws regarding online gaming</li>
            <li>• You acknowledge blockchain gaming regulations in your jurisdiction</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Account and Wallet</h3>
          <ul className="space-y-1 ml-4">
            <li>• You are responsible for your wallet security</li>
            <li>• Never share your private keys or seed phrases</li>
            <li>• All transactions are irreversible on the blockchain</li>
            <li>• You accept full responsibility for wallet management</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Game Participation</h3>
          <ul className="space-y-1 ml-4">
            <li>• All games are based on chance and probability</li>
            <li>• No guarantees of winning or specific outcomes</li>
            <li>• Games may be modified or discontinued at any time</li>
            <li>• You understand the risks of blockchain-based gaming</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Token Usage</h3>
          <ul className="space-y-1 ml-4">
            <li>• MORBIUS tokens are used for gameplay and prizes</li>
            <li>• PLS tokens pay for PulseChain network fees</li>
            <li>• Token values fluctuate based on market conditions</li>
            <li>• You accept cryptocurrency volatility risks</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Fair Play Commitment</h3>
          <ul className="space-y-1 ml-4">
            <li>• Play fairly and do not attempt to manipulate games</li>
            <li>• Do not use bots, scripts, or automated tools</li>
            <li>• Report any bugs or vulnerabilities discovered</li>
            <li>• Respect other players and platform integrity</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Platform Changes</h3>
          <p>
            We reserve the right to modify, suspend, or discontinue any aspect of the platform at any time. We will provide reasonable notice for major changes.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Acknowledgment</h3>
          <p>
            By using Morbius.io, you acknowledge that you have read, understood, and agree to be bound by this User Agreement and all related policies.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}