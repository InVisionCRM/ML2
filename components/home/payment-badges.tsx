import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface PaymentBadgesProps {
  className?: string
}

export function PaymentBadges({ className }: PaymentBadgesProps) {
  return (
    <div className={cn("absolute top-4 left-4 flex gap-2", className)}>
      {/* Morbius Badge */}
      <Badge
        variant="outline"
        className="bg-purple-950/80 border-purple-400/50 text-purple-300 hover:bg-purple-900/90 transition-colors text-xs font-medium px-2 py-1"
      >
        Morbius
      </Badge>

      {/* PLS Badge */}
      <Badge
        variant="outline"
        className="bg-blue-950/80 border-blue-400/50 text-blue-300 hover:bg-blue-900/90 transition-colors text-xs font-medium px-2 py-1"
      >
        PLS
      </Badge>
    </div>
  )
}