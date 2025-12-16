'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatUnits } from 'viem'
import { TOKEN_DECIMALS, TICKET_PRICE } from '@/lib/contracts'
import { PlayerTicketsModal } from './player-tickets-modal'
import { PlayerStatsModal } from './player-stats-modal'
import { MultiClaimModal } from './modals/multi-claim-modal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RoundHistory } from './round-history'
import { ChevronUp, ChevronDown, History } from 'lucide-react'
import PhysicsMachine from './ball-draw-simulator/PhysicsMachine'
import BallResult from './ball-draw-simulator/BallResult'
import { DrawState } from './ball-draw-simulator/types'

interface RoundTimerProps {
  endTime: bigint
  fallbackRemaining?: bigint // optional timeRemaining from contract
  roundId?: number | bigint
  totalPssh?: bigint
  previousRoundId?: number // Previous round ID for display
  disabled?: boolean
  houseTicketNumbers?: number[] // Contract's own ticket numbers
  winningNumbers?: number[] // Currently drawn winning numbers for highlighting
  playerTickets?: Array<{
    ticketId: bigint | number
    numbers: readonly (number | bigint)[]
    isFreeTicket: boolean
    transactionHash?: string
  }> // User's tickets for this round
  onBuyTicketsClick?: () => void // New prop for buy tickets button
  onShowDashboard?: () => void // Callback to show dashboard modal
  onDrawStart?: () => void // Callback when ball draw starts
  onDrawEnd?: () => void // Callback when ball draw ends
}

const DISPLAY_OFFSET_SECONDS = 15

function formatSeconds(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Calculate responsive size for physics machine (responsive with a 350px cap)
const getPhysicsMachineSize = () => {
  if (typeof window === 'undefined') return { width: 280, height: 280 }
  const maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.7
  const size = Math.min(maxSize, 332) // +18 wrapper = max 350px visible
  return { width: size, height: size }
}

export function RoundTimer({ endTime, fallbackRemaining = BigInt(0), roundId, totalPssh, previousRoundId, disabled = false, houseTicketNumbers = [], winningNumbers = [], playerTickets = [], onBuyTicketsClick, onShowDashboard, onDrawStart, onDrawEnd }: RoundTimerProps) {
  // Convert BigInt to number once to avoid recreating dependencies
  const endTimeNum = Number(endTime)
  const fallbackNum = Number(fallbackRemaining)

  const [remaining, setRemaining] = useState<number>(() => {
    const fromEnd = endTimeNum * 1000 - Date.now()
    if (!Number.isNaN(fromEnd) && fromEnd > 0) return Math.floor(fromEnd / 1000) + DISPLAY_OFFSET_SECONDS
    return fallbackNum + DISPLAY_OFFSET_SECONDS
  })

  // Ticket carousel state
  const [ticketIndex, setTicketIndex] = useState(0)

  // Delay winning numbers for highlighting to sync with ball draw animation
  const [delayedWinningNumbers, setDelayedWinningNumbers] = useState<number[]>([])

  // Ball draw simulator state
  const [currentState, setCurrentState] = useState<DrawState>(DrawState.IDLE)
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]) // Winning numbers drawn
  const [drawnBallIds, setDrawnBallIds] = useState<number[]>([]) // Ball IDs that have been drawn
  const [triggerDraw, setTriggerDraw] = useState(false)
  const [currentTarget, setCurrentTarget] = useState<number | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [machineSize, setMachineSize] = useState(getPhysicsMachineSize())
  const startedRef = useRef(false)
  const lastNumbersKeyRef = useRef<string | null>(null)
  const hasAnimatedRef = useRef(false) // Track if animation has played for current round
  const completedRef = useRef(false) // Track if onComplete has been called for current round
  const clampedMachineSize = Math.min(machineSize.width, 330) // keep globe large but responsive
  const visualSize = Math.min(clampedMachineSize + 5, 335) // wrapper only 5px larger than globe

  useEffect(() => {
    if (winningNumbers.length > delayedWinningNumbers.length) {
      // Add delay to sync with ball draw animation timing
      const timeout = setTimeout(() => {
        setDelayedWinningNumbers(winningNumbers)
      }, 3500) // 1.5 second delay to match ball draw timing

      return () => clearTimeout(timeout)
    } else if (winningNumbers.length === 0) {
      // Reset when no winning numbers
      setDelayedWinningNumbers([])
    }
  }, [winningNumbers, delayedWinningNumbers.length])

  const [showHistory, setShowHistory] = useState(false)

  // Buttons should always be clickable regardless of disabled state
  const cardDisabledClass = ''

  const resetDraw = () => {
    setDrawnNumbers([])
    setDrawnBallIds([])
    setCurrentTarget(null)
    setTriggerDraw(false)
  }

  // Trigger draw when winning numbers become available (round finalized)
  useEffect(() => {
    if (winningNumbers.length === 6 && !hasAnimatedRef.current) {
      console.log('🎰 Round finalized! Starting ball draw animation with numbers:', winningNumbers)

      // Reset animation state for new round
      hasAnimatedRef.current = true
      completedRef.current = false
      setCurrentState(DrawState.IDLE)
      resetDraw()

      // Small delay before starting animation
      const startTimeout = setTimeout(() => {
        setCurrentState(DrawState.MIXING)
      }, 500)

      return () => clearTimeout(startTimeout)
    } else if (winningNumbers.length === 0) {
      // Reset when no winning numbers (new round started)
      hasAnimatedRef.current = false
      completedRef.current = false
      setCurrentState(DrawState.IDLE)
      resetDraw()
    }
  }, [winningNumbers, hasAnimatedRef, completedRef])

  // Ball draw orchestrator effect
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    // Phase 1: Mixing
    if (currentState === DrawState.MIXING) {
      onDrawStart?.()
      timeout = setTimeout(() => {
        setCurrentState(DrawState.DRAWING)
      }, 2500)
    }

    // Phase 2: Drawing Balls
    if (currentState === DrawState.DRAWING) {
      if (drawnNumbers.length < 6) {
        // Set target to the next winning number
        const nextWinningNumber = winningNumbers[drawnNumbers.length]
        setCurrentTarget(nextWinningNumber)

        timeout = setTimeout(() => {
          setTriggerDraw(true)
        }, 2000)
      } else {
        setCurrentState(DrawState.COMPLETED)
        // Only fire callbacks once per round
        if (!completedRef.current) {
          completedRef.current = true
          onDrawEnd?.()
        }
      }
    }

    return () => clearTimeout(timeout)
  }, [currentState, drawnNumbers, winningNumbers])

  // Ball selection callback
  const handleBallSelected = useCallback((ballId: number, number: number) => {
    console.log('🎱 Ball selected:', { ballId, number, currentTarget })

    if (number === currentTarget) {
      setDrawnNumbers(prev => [...prev, number])
      setDrawnBallIds(prev => [...prev, ballId])
      setTriggerDraw(false)
      setCurrentTarget(null)
    }
  }, [currentTarget])

  useEffect(() => {
    const update = () => {
      const ms = endTimeNum * 1000 - Date.now()
      if (!Number.isNaN(ms)) {
        setRemaining(Math.max(0, Math.floor(ms / 1000) + DISPLAY_OFFSET_SECONDS))
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endTimeNum])

  const formatPssh = (amount: bigint) => {
    return parseFloat(formatUnits(amount, TOKEN_DECIMALS)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  }


  return (
    <>
      <Card className={`px-4 py-0 sm:px-6 sm:py-0 md:px-8 md:py-0 border-white/10 relative min-h-[680px] sm:min-h-[680px] md:min-h-[690px] max-w-3xl w-full mx-auto bg-Black/10 backdrop-blur-md ${cardDisabledClass}`}>
      {/* House Ticket Numbers - Vertical on left */}
      <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 sm:gap-2">
        {houseTicketNumbers && houseTicketNumbers.length === 6 ? (
          houseTicketNumbers.map((num, idx) => (
            <div
              key={idx}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-950/20 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg"
            >
              {num}
            </div>
          ))
        ) : houseTicketNumbers && houseTicketNumbers.length > 0 ? (
          <div className="text-xs text-white/30 text-center">
            {houseTicketNumbers.length}/6
          </div>
        ) : (
          <div className="text-xs text-white/30 text-center">
            -
          </div>
        )}
      </div>


      {/* Timer at top-right */}
      <div className="absolute top-1 sm:top-2 right-1 sm:right-2 text-right">
        <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-pink-400 bg-clip-text text-transparent">
          {formatSeconds(remaining)}
        </div>
      </div>

      {/* Ball Draw Simulator - Integrated */}
      {/* Round Winning Numbers Title */}
      <div className="absolute top-4 left-0 right-0 flex justify-center mt-1 z-10">
        <div className="text-xs sm:text-xs text-white/70 font-bold uppercase tracking-wide text-center">
          Round <span className="text-sm sm:text-base text-green-600 font-extrabold">{previousRoundId || roundId || '?'}</span> Winning Numbers
        </div>
      </div>

      {/* Drawn Numbers Display */}
      <div className="absolute top-14 left-0 right-0 flex rounded-full justify-center z-20">
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-center items-center px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`ball-${i}`}
              className={`w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center rounded-full`}
            >
              {drawnNumbers[i] ? (
                <BallResult number={drawnNumbers[i]} type="white" animate={true} />
              ) : (
                <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-white border-dashed flex items-center justify-center">
                  {/* Empty placeholder - no numbers */}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Physics Machine */}
      <div className="absolute inset-0 flex items-center justify-center z-5 pointer-events-none">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center transition-transform relative">
            <div
              className="glass-panel p-0.5 rounded-full shadow-[0_0_55px_-12px_rgba(59,130,246,0.25)] relative border border-white/5 bg-gray-900/40 z-0 overflow-visible flex items-center justify-center"
              style={{ width: `${visualSize}px`, height: `${visualSize}px` }}
            >
            <div className="absolute inset-0 animate-[spin_30s_linear_infinite] pointer-events-none">
              <span
                className="absolute inset-0 bg-[url('/morbius/MorbiusLogo%20(3).png')] bg-center bg-no-repeat bg-[length:180px_180px] opacity-50"
              />
            </div>
            <PhysicsMachine
              width={clampedMachineSize}
              height={clampedMachineSize}
              ballCount={30}
              isMixing={currentState === DrawState.MIXING || currentState === DrawState.DRAWING}
              drawnBallIds={drawnBallIds}
              onBallSelected={handleBallSelected}
              triggerDraw={triggerDraw}
              targetWinningNumber={currentTarget}
              isBackground={true}
            />
            {/* Reflection Overlay */}
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none sphere-overlay z-10"></div>
          </div>
        </div>
        </div>
      </div>

      {/* Your Numbers Display - Above Buttons */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        {playerTickets.length > 0 ? (
          <>
            {/* Title */}
            <div className="text-xs sm:text-base text-white/80 font-bold uppercase tracking-wide">
              Your Numbers
            </div>

            {/* Navigation and numbers container */}
            <div className="flex items-center gap-2">
              {/* Left navigation arrow */}
              {playerTickets.length > 1 && (
                <button
                  onClick={() => setTicketIndex(Math.max(0, ticketIndex - 1))}
                  disabled={ticketIndex === 0}
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white/60 text-base"
                >
                  ‹
                </button>
              )}

              {/* Current ticket numbers - horizontal */}
              <div className="flex gap-1 sm:gap-2">
                {playerTickets[ticketIndex]?.numbers.slice(0, 6).map((num, idx) => {
                  const isDrawn = delayedWinningNumbers.includes(Number(num))
                  return (
                    <div
                      key={idx}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-base shadow-lg transition-all duration-300 ${
                        isDrawn
                          ? 'bg-green-500 border-2 border-green-300 shadow-[0_0_12px_rgba(34,197,94,0.8)]'
                          : 'bg-blue-950/20 backdrop-blur-sm border border-white/20'
                      }`}
                    >
                      {num}
                    </div>
                  )
                })}
              </div>

              {/* Right navigation arrow */}
              {playerTickets.length > 1 && (
                <button
                  onClick={() => setTicketIndex(Math.min(playerTickets.length - 1, ticketIndex + 1))}
                  disabled={ticketIndex === playerTickets.length - 1}
                  className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white/60 text-base"
                >
                  ›
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-xs text-white/30">
            No tickets
          </div>
        )}
      </div>

      {/* Action Buttons - Below Your Numbers */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 sm:gap-3 z-10">
        {/* Round History Button */}
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="text-white bg-slate-900 border-white/10 hover:bg-black/60 w-10 h-10 p-0"
          title="Round History"
        >
          <History className="w-5 h-5" />
        </Button>

        {/* Claim winnings button */}
        <div>
          <MultiClaimModal />
        </div>

        {/* Dashboard button */}
        {onShowDashboard && (
          <Button
            variant="outline"
            onClick={onShowDashboard}
            className="text-white bg-slate-900 border-white/10 hover:bg-black/60 w-10 h-10 p-0"
            title="Dashboard"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </Button>
        )}

        {/* Your tickets button */}
        <div>
          <PlayerTicketsModal roundId={roundId} playerTickets={playerTickets} />
        </div>

        {/* Payouts button (conditional) */}
        {totalPssh !== undefined && (
          <div>
            <PayoutBreakdownDialog totalPssh={totalPssh} />
          </div>
        )}

        {/* Tickets Button - Moved to last position */}
        {onBuyTicketsClick && (
          <Button
            variant="outline"
            className="text-white bg-green-500/50 hover:bg-green-600/60 border-white/10 px-4 py-2 h-10 min-w-[80px] font-bold"
            title="Buy lottery tickets"
            onClick={onBuyTicketsClick}
          >
            BUY
          </Button>
        )}
      </div>
    </Card>

      {/* Round History Dropdown */}
      {showHistory && roundId && (
        <div className="mt-4">
          <RoundHistory currentRoundId={Number(roundId)} />
        </div>
      )}
    </>
  )
}

interface PayoutBreakdownDialogProps {
  totalPssh?: bigint
}

export function PayoutBreakdownDialog({ totalPssh }: PayoutBreakdownDialogProps) {
  if (totalPssh === undefined) return null

  const total = Number(totalPssh)
  const formatPssh = (amount: number) =>
    parseFloat(formatUnits(BigInt(Math.floor(amount)), TOKEN_DECIMALS)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })

  const winnersPool = total * 0.70
  const burnAllocation = total * 0.10
  const megaBank = total * 0.10
  const keeperFee = total * 0.05
  const deployerFee = total * 0.05

  const brackets = [
    { id: 6, label: 'Match 6 (15,000 MOR)', amount: 15000, hasMegaBonus: true },
    { id: 5, label: 'Match 5 (5,000 MOR)', amount: 5000, hasMegaBonus: true },
    { id: 4, label: 'Match 4 (2,000 MOR)', amount: 2000, hasMegaBonus: false },
    { id: 3, label: 'Match 3 (750 MOR)', amount: 750, hasMegaBonus: false },
    { id: 2, label: 'Match 2 (250 MOR)', amount: 250, hasMegaBonus: false },
    { id: 1, label: 'Match 1 (100 MOR)', amount: 100, hasMegaBonus: false },
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-white z-10 w-10 h-10 p-0 bg-slate-900/50 backdrop-blur-sm border-white/20 hover:bg-slate-800/60" title="Payouts">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-black border-white/10">
        <DialogHeader>
          <DialogTitle>Payout Breakdown</DialogTitle>
          <DialogDescription>Distribution of the current pool</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm text-white">
          <div className="bg-black/40 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-white">Winners Pool</span>
              <span className="text-white/80">70%</span>
            </div>
            <div className="text-white/60 mb-3">{formatPssh(winnersPool)} Morbius</div>
            <div className="space-y-1.5 pl-2 border-l-2 border-white/10">
              {brackets.map((bracket) => (
                <div key={bracket.id} className="flex items-center justify-between text-xs">
                  <span className="text-white/70">
                    {bracket.label}
                    {bracket.hasMegaBonus && <span className="text-yellow-400 ml-1">🎰</span>}
                  </span>
                  <span className="text-white/60">{bracket.amount.toLocaleString()} Morbius</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-black/40 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Burn</span>
              <span className="text-white/80">10%</span>
            </div>
            <div className="text-white/60 mt-1">{formatPssh(burnAllocation)} Morbius</div>
          </div>

          <div className="bg-black/40 rounded-lg p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">MegaMorbius Bank</span>
              <span className="text-white/80">10%</span>
            </div>
            <div className="text-white/60 mt-1">{formatPssh(megaBank)} Morbius</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/40 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">Keeper</span>
                <span className="text-white/80 text-xs">5%</span>
              </div>
              <div className="text-white/60 mt-1 text-xs">{formatPssh(keeperFee)} Morbius</div>
            </div>

            <div className="bg-black/40 rounded-lg p-3 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">Deployer</span>
                <span className="text-white/80 text-xs">5%</span>
              </div>
              <div className="text-white/60 mt-1 text-xs">{formatPssh(deployerFee)} Morbius</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
