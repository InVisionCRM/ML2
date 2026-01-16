import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AboutUsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutUsModal({ open, onOpenChange }: AboutUsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/20 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-6">
            About Us
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <p>
            Welcome to Morbius.io - the premier blockchain gaming platform on PulseChain.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Our Mission</h3>
          <p>
            To provide fair, transparent, and entertaining blockchain-based gaming experiences that leverage the power of decentralized technology while maintaining the highest standards of security and user experience.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">What We Offer</h3>
          <ul className="space-y-1 ml-4">
            <li>• Mega Morbius Lotto - 6/55 number lottery with massive prize pools</li>
            <li>• Crypto Keno - Fast-paced number matching games</li>
            <li>• Plinko - Physics-based ball dropping entertainment</li>
            <li>• Secure wallet integration with PulseChain</li>
            <li>• Transparent prize distribution via smart contracts</li>
          </ul>

          <h3 className="text-lg font-semibold mt-6 mb-2">Our Technology</h3>
          <p>
            Built on PulseChain, our platform utilizes cutting-edge smart contract technology to ensure fair gameplay, transparent prize distribution, and complete decentralization. All games are provably fair with results determined by blockchain oracles and cryptographic functions.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Community First</h3>
          <p>
            We believe in building a strong gaming community where players can enjoy entertainment while participating in the decentralized future. Join thousands of players who trust Morbius.io for their blockchain gaming needs.
          </p>

          <h3 className="text-lg font-semibold mt-6 mb-2">Contact Us</h3>
          <p>
            Have questions or feedback? Reach out through our official channels or interact with our smart contracts directly on PulseChain.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}