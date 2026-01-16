import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface FAQModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FAQModal({ open, onOpenChange }: FAQModalProps) {
  const faqs = [
    {
      question: "What is Morbius.io?",
      answer: "Morbius.io is a gaming platform offering various blockchain-based games including Lottery, KENO, and Plinko, all built on PulseChain for fast, affordable gaming."
    },
    {
      question: "What is PulseChain?",
      answer: "PulseChain is a high-performance blockchain designed for gaming and DeFi. It offers sub-second transaction confirmations and extremely low fees compared to other networks."
    },
    {
      question: "How do I connect my wallet?",
      answer: "Install MetaMask or another PulseChain-compatible wallet. Add PulseChain network (Chain ID: 369), and connect to Morbius.io to start playing instantly."
    },
    {
      question: "What tokens can I use?",
      answer: "Our platform accepts MORBIUS tokens and PulseChain PLS. Both are native to the ecosystem and offer different benefits for gaming."
    },
    {
      question: "Are the games fair?",
      answer: "Yes! All games use provably fair mechanics. Lottery uses cryptographic randomness, Keno uses blockchain entropy, and Plinko uses physics simulation. Results are transparent and verifiable."
    },
    {
      question: "What are the fees?",
      answer: "Only PulseChain network fees apply (typically $0.001 per transaction). We don't charge platform fees - the standard 5% contract fee goes directly to prize pools."
    },
    {
      question: "Can I play for free?",
      answer: "Some games offer free play modes for practice. Full gameplay requires MORBIUS or PLS tokens, but you can start with very small amounts."
    },
    {
      question: "How do I claim my winnings?",
      answer: "Winnings are automatically sent to your connected wallet. For lottery prizes, use the claim function in your dashboard. All transactions are instant on PulseChain."
    },
    {
      question: "Is my data safe?",
      answer: "We use minimal data collection and never sell your information. All interactions happen through your wallet - we never store private keys or sensitive data."
    },
    {
      question: "What if I have issues?",
      answer: "Check our FAQ sections, contact us through blockchain transactions, or reach out via our community channels. We're here to help!"
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/75 border-white/20 text-white max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center mb-8">
            <DialogTitle className="text-3xl font-bold mb-3 text white">
              Frequently Asked Questions
            </DialogTitle>
            <div className="w-20 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-400 mx-auto"></div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/10 hover:bg-white/10 transition-colors">
              <h3 className="text-lg font-bold text-white mb-3 flex items-start gap-2">
                <span className="text-cyan-400 mt-1">Q:</span>
                {faq.question}
              </h3>
              <div className="ml-6">
                <p className="text-cyan-200 font-medium mb-1">A:</p>
                <p className="text-white/80 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-6 border-t border-white/10 mt-6">
          <div className="bg-gradient-to-r from-cyan-950/20 to-blue-950/20 p-4 rounded border border-cyan-400/20">
            <p className="text-cyan-200 text-sm mb-2">
              <strong>Still have questions?</strong>
            </p>
            <p className="text-white/70 text-sm">
              Reach out through our blockchain addresses, community forums, or social media channels.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}