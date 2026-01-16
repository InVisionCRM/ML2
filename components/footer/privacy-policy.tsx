import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PrivacyPolicyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/20 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            Privacy Policy
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Last updated: January 2026</strong>
          </p>

          <p>
            Your privacy is important to us. This policy explains how Morbius.io collects, uses, and protects your information.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Information We Collect</h3>
          <ul className="space-y-1 ml-4">
            <li>• Wallet address and transaction history for game services</li>
            <li>• Anonymized gameplay data to improve our services</li>
            <li>• Basic technical information for security and performance</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">How We Use Your Information</h3>
          <ul className="space-y-1 ml-4">
            <li>• Provide and maintain gaming services</li>
            <li>• Process transactions and display game results</li>
            <li>• Ensure fair gameplay and prevent cheating</li>
            <li>• Improve our services and develop new features</li>
            <li>• Comply with legal obligations</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Information Sharing</h3>
          <p>
            We do NOT sell, trade, or rent your personal information to third parties. We may share information only when required by law or with trusted partners under strict confidentiality. All transactions are publicly visible on PulseChain due to blockchain transparency.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Data Security</h3>
          <p>
            We implement industry-standard security measures including end-to-end encryption, secure wallet connections, regular security audits, and minimal data collection. No persistent storage of sensitive information is maintained.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Your Rights</h3>
          <p>
            You have the right to access, correct, or request deletion of your data. Contact us through official channels or blockchain transactions to exercise these rights.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Contact</h3>
          <p>
            For questions about this Privacy Policy, reach us through blockchain transactions, official social media channels, or community forums.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}