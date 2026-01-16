import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TermsOfServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsOfServiceModal({ open, onOpenChange }: TermsOfServiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/20 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            Terms of Service
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            <strong>Last updated: January 2026</strong>
          </p>

          <p>
            These Terms of Service govern your use of Morbius.io. By accessing or using our platform, you agree to be bound by these terms.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Acceptance of Terms</h3>
          <p>
            By accessing and using Morbius.io, you accept and agree to be bound by these terms. Your continued use constitutes acceptance of these terms.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Description of Service</h3>
          <p>Morbius.io provides:</p>
          <ul className="space-y-1 ml-4">
            <li>• Lottery games with prize pools</li>
            <li>• Keno number selection games</li>
            <li>• Plinko physics-based games</li>
            <li>• MORBIUS and PLS token integration</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">User Responsibilities</h3>
          <ul className="space-y-1 ml-4">
            <li>• Must be at least 18 years old</li>
            <li>• Comply with all applicable laws</li>
            <li>• Maintain wallet security</li>
            <li>• Play fairly and report bugs</li>
            <li>• Do not use bots or cheat</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Payment Terms</h3>
          <ul className="space-y-1 ml-4">
            <li>• Accepts MORBIUS and PLS tokens</li>
            <li>• Users pay PulseChain network fees</li>
            <li>• Standard 5% contract fee for prize pools</li>
            <li>• No refunds due to blockchain immutability</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Prohibited Uses</h3>
          <ul className="space-y-1 ml-4">
            <li>• Illegal activities</li>
            <li>• Hacking or exploiting the platform</li>
            <li>• Using bots or automated tools</li>
            <li>• Sharing accounts or cheating</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Disclaimers</h3>
          <ul className="space-y-1 ml-4">
            <li>• All games are based on chance</li>
            <li>• No guarantees of winning</li>
            <li>• Blockchain carries inherent risks</li>
            <li>• This is beta software - use at your own risk</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Limitation of Liability</h3>
          <p>
            Morbius.io shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use of the service.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Contact</h3>
          <p>
            For questions about these Terms of Service, reach us through blockchain transactions, official social media, or community forums.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}