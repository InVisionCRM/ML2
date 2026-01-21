'use client'

import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { WHEEL_SEGMENTS, TOTAL_SEGMENTS, PHYSICS } from '@/app/BIG-WHEEL/constants';
import { WheelSegment, SpinState } from '@/app/BIG-WHEEL/types';

interface BigWheelGameProps {
  onSpinComplete: (segment: WheelSegment) => void;
  isSpinning: boolean;
  onSpinStart?: () => void;
  targetSegment?: number; // For contract mode - predetermined result
  soundEnabled?: boolean;
  size?: number;
}

export interface BigWheelGameRef {
  spin: (targetIndex?: number) => void;
  reset: () => void;
}

const BigWheelGame = forwardRef<BigWheelGameRef, BigWheelGameProps>(({
  onSpinComplete,
  isSpinning,
  onSpinStart,
  targetSegment,
  soundEnabled = true,
  size = 400,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const idleAnimationRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentRotation, setCurrentRotation] = useState(0);
  const [spinState, setSpinState] = useState<SpinState>('idle');
  const [winningSegment, setWinningSegment] = useState<WheelSegment | null>(null);
  const [isIdleMode, setIsIdleMode] = useState(false);
  const [highlightOpacity, setHighlightOpacity] = useState(1);

  // Animation state
  const rotationRef = useRef(0);
  const targetRotationRef = useRef(0);
  const startRotationRef = useRef(0); // Starting rotation position for this spin
  const startTimeRef = useRef(0);
  const spinDurationRef = useRef(0);
  const targetSegmentIndexRef = useRef<number | undefined>(undefined); // Store target segment for contract mode
  const lastProcessedTargetRef = useRef<number | undefined>(undefined); // Prevent duplicate spin triggers
  const lastPegHitRef = useRef<number>(-1); // Track last peg hit to avoid multiple hits
  const lastFrameTimeRef = useRef(0); // For frame rate limiting
  const idleTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const fadeIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Initialize audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/peghit.mp3');
      audioRef.current.volume = 0.3;
    }
  }, []);

  // Play tick sound
  const playTick = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Idle animation - slow continuous rotation
  const startIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current || spinState !== 'idle') return;

    setIsIdleMode(true);

    const idleAnimate = () => {
      const now = performance.now();
      const deltaTime = now - (lastFrameTimeRef.current || now);
      lastFrameTimeRef.current = now;

      // Slow rotation: 5 degrees per second for subtle idle animation
      const rotationSpeed = 5; // degrees per second
      const rotationDelta = (rotationSpeed * deltaTime) / 1000;

      rotationRef.current = (rotationRef.current + rotationDelta) % 360;
      setCurrentRotation(rotationRef.current);
      drawWheel(rotationRef.current);

      idleAnimationRef.current = requestAnimationFrame(idleAnimate);
    };

    idleAnimationRef.current = requestAnimationFrame(idleAnimate);
  }, [spinState]);

  // Stop idle animation
  const stopIdleAnimation = useCallback(() => {
    if (idleAnimationRef.current) {
      cancelAnimationFrame(idleAnimationRef.current);
      idleAnimationRef.current = undefined;
    }
    setIsIdleMode(false);
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = undefined;
    }
  }, []);

  // No idle timer needed - wheel stays at starting position

  // Ensure wheel stays at starting position (no idle animation)
  useEffect(() => {
    if (spinState === 'idle') {
      // Keep wheel at starting position (0 degrees)
      rotationRef.current = 0;
      setCurrentRotation(0);
      stopIdleAnimation();
    }
  }, [spinState, stopIdleAnimation]);

  // Stop idle animation when spinning starts
  useEffect(() => {
    if (spinState === 'spinning') {
      stopIdleAnimation();
    }
  }, [spinState, stopIdleAnimation]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (idleAnimationRef.current) {
        cancelAnimationFrame(idleAnimationRef.current);
      }
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  // Check for peg collisions and apply physics (simplified)
  const checkPegCollision = useCallback((currentRot: number, unused: number): number => {
    // Simplified peg collision - just check if we should apply a small speed reduction
    // This is called to determine if a peg hit should occur
    const normalizedRotation = ((currentRot % 360) + 360) % 360;

    // Check if we're near any segment boundary (peg position)
    let cumulativeAngle = 0;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      const pegAngle = cumulativeAngle;
      const angleDiff = Math.abs(normalizedRotation - pegAngle) % 360;
      const minAngleDiff = Math.min(angleDiff, 360 - angleDiff);

      // If we're within 5 degrees of a peg, consider it a hit
      if (minAngleDiff < 5) {
        return 1; // Return non-zero to indicate peg hit
      }

      cumulativeAngle += WHEEL_SEGMENTS[i].arcLength;
    }

    return 0; // No peg hit
  }, []);

  // Calculate which segment is at the pointer (top position)
  const getSegmentAtPointer = useCallback((rotation: number): WheelSegment => {
    // Normalize rotation to 0-360
    const normalizedRotation = ((rotation % 360) + 360) % 360;

    // Pointer is fixed at 270° (12 o'clock/top) in the rotated coordinate system
    // To find which segment is under the pointer, we need to find the angle in the original coordinate system
    // Since the wheel rotates clockwise by R, the original angle that ends up at 270° is (270° + R) mod 360°

    const originalAngleAtPointer = (270 + normalizedRotation) % 360;

    // Find which segment contains this original angle
    let cumulativeAngle = 0;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      const segment = WHEEL_SEGMENTS[i];
      const segmentStart = cumulativeAngle;
      const segmentEnd = cumulativeAngle + segment.arcLength;

      // Handle wrap-around at 360°
      if (segmentStart <= segmentEnd) {
        // Normal case
        if (originalAngleAtPointer >= segmentStart && originalAngleAtPointer < segmentEnd) {
          return segment;
        }
      } else {
        // Segment wraps around 0°
        if (originalAngleAtPointer >= segmentStart || originalAngleAtPointer < segmentEnd) {
          return segment;
        }
      }

      cumulativeAngle += segment.arcLength;
    }

    // Fallback to first segment if something goes wrong
    return WHEEL_SEGMENTS[0];
  }, []);

  // Draw the wheel with PLINKO-style dark gradient theme
  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;
    const innerRadius = radius * 0.15;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw outer ring/frame with dark gradient
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 15, 0, Math.PI * 2);
    const frameGradient = ctx.createRadialGradient(centerX, centerY, radius, centerX, centerY, radius + 20);
    frameGradient.addColorStop(0, 'rgb(16, 26, 35)');
    frameGradient.addColorStop(0.5, 'rgb(35, 36, 41)');
    frameGradient.addColorStop(1, 'rgb(16, 26, 35)');
    ctx.fillStyle = frameGradient;
    ctx.fill();

    // Draw pegs at segment boundaries (cyan colored)
    let cumulativePegAngle = 0;
    for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
      const pegAngle = cumulativePegAngle * (Math.PI / 180);
      const pegX = centerX + (radius + 8) * Math.cos(pegAngle);
      const pegY = centerY + (radius + 8) * Math.sin(pegAngle);

      ctx.beginPath();
      ctx.arc(pegX, pegY, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      cumulativePegAngle += WHEEL_SEGMENTS[i].arcLength;
    }

    // Save context for rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation * Math.PI / 180);

    // Draw segments with alternating dark gradients
    let cumulativeAngle = 0;

    WHEEL_SEGMENTS.forEach((segment, index) => {
      const startAngle = (cumulativeAngle * Math.PI) / 180; // Convert degrees to radians
      const endAngle = ((cumulativeAngle + segment.arcLength) * Math.PI) / 180; // Convert degrees to radians

      // Draw segment with dark gradient - alternating slightly
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      // Create gradient based on multiplier for subtle variation
      const gradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, radius);

      // Higher multipliers get slightly more cyan tint
      const cyanIntensity = Math.min(segment.multiplier / 40, 1) * 0.15;

      if (index % 2 === 0) {
        gradient.addColorStop(0, `rgba(35, 45, 55, 1)`);
        gradient.addColorStop(0.7, `rgba(25, 35, 45, 1)`);
        gradient.addColorStop(1, `rgba(16, 26, 35, 1)`);
      } else {
        gradient.addColorStop(0, `rgba(45, 55, 65, 1)`);
        gradient.addColorStop(0.7, `rgba(35, 45, 55, 1)`);
        gradient.addColorStop(1, `rgba(25, 35, 45, 1)`);
      }

      ctx.fillStyle = gradient;
      ctx.fill();

      // Add cyan glow for high-value segments
      if (segment.multiplier >= 10) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        const glowGradient = ctx.createRadialGradient(0, 0, innerRadius, 0, 0, radius);
        glowGradient.addColorStop(0, `rgba(6, 182, 212, ${0.1 + cyanIntensity})`);
        glowGradient.addColorStop(1, `rgba(6, 182, 212, ${0.02 + cyanIntensity * 0.5})`);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        ctx.restore();
      }

      // Draw segment border
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw segment label
      const midAngle = startAngle + (segment.arcLength * Math.PI / 180) / 2;
      const labelRadius = radius * 0.85; // Move labels closer to the edge
      const labelX = labelRadius * Math.cos(midAngle);
      const labelY = labelRadius * Math.sin(midAngle);

      ctx.save();
      ctx.translate(labelX, labelY);
      ctx.rotate(midAngle + Math.PI / 2);

      // Text color based on multiplier - cyan for higher values
      const textAlpha = 0.6 + (segment.multiplier / 40) * 0.4;
      ctx.fillStyle = `rgba(6, 182, 212, ${textAlpha})`;
      ctx.font = `bold ${radius * 0.08}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Display value (no $ sign)
      if (segment.value === 'JOKER') {
        ctx.fillText('J', 0, 0);
      } else if (segment.value === 'MORBIUS') {
        ctx.fillText('M', 0, 0);
      } else {
        ctx.fillText(segment.value, 0, 0);
      }

      ctx.restore();

      // Highlight all segments with the same multiplier as the winning segment
      if (winningSegment && winningSegment.value === segment.value && spinState === 'stopped') {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = `rgba(6, 182, 212, ${highlightOpacity})`;
        ctx.lineWidth = 4;
        ctx.stroke();

        // Add glow effect with fade
        ctx.shadowColor = `rgba(6, 182, 212, ${highlightOpacity * 0.8})`;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      cumulativeAngle += segment.arcLength;
    });

    // Draw center hub with dark gradient
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    const hubGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, innerRadius);
    hubGradient.addColorStop(0, 'rgb(45, 55, 65)');
    hubGradient.addColorStop(0.5, 'rgb(35, 45, 55)');
    hubGradient.addColorStop(1, 'rgb(16, 26, 35)');
    ctx.fillStyle = hubGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw center decoration
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(16, 26, 35)';
    ctx.fill();
    ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.font = `bold ${innerRadius * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 0, 0);

    ctx.restore();

    // Draw pointer (top of wheel) with cyan accent
    drawPointer(ctx, centerX, centerY - radius - 30);
  }, [winningSegment, spinState]);

  // Draw the pointer/flapper with cyan theme
  const drawPointer = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    ctx.translate(x, y);

    // Pointer body with cyan gradient
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(-12, -0);
    ctx.lineTo(0, 0);
    ctx.lineTo(12, -0);
    ctx.closePath();

    const pointerGradient = ctx.createLinearGradient(-12, -8, 12, 30);
    pointerGradient.addColorStop(0, 'rgba(95, 6, 212, 0.9)');
    pointerGradient.addColorStop(0.5, 'rgba(106, 9, 141, 0.9)');
    pointerGradient.addColorStop(1, 'rgba(78, 6, 155, 0.9)');
    ctx.fillStyle = pointerGradient;
    ctx.fill();

    // Add glow
    ctx.shadowColor = 'rgba(247, 249, 249, 0.53)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pointer highlight
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.lineTo(-6, -4);
    ctx.lineTo(0, 2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(51, 42, 58, 0.13)';
    ctx.fill();

    ctx.restore();
  };

  // Animation loop with smooth physics
  const animate = useCallback(() => {
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    const duration = spinDurationRef.current;

    if (elapsed < duration) {
      // Use smooth cubic ease-out for stable deceleration
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      // Calculate the total rotation needed for this spin
      const totalRotationNeeded = targetRotationRef.current - startRotationRef.current;
      const currentIncrementalRotation = totalRotationNeeded * easedProgress;

      // Add to the current rotation (starts from current position)
      const currentRot = startRotationRef.current + currentIncrementalRotation;

      // Track segment changes for tick sounds
      const prevSegment = getSegmentAtPointer(rotationRef.current);
      rotationRef.current = currentRot;
      const newSegment = getSegmentAtPointer(currentRot);

      if (prevSegment.id !== newSegment.id) {
        playTick();
      }

      setCurrentRotation(currentRot);
      drawWheel(currentRot);

      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Spin complete - ensure exact final position
      rotationRef.current = targetRotationRef.current;
      setCurrentRotation(targetRotationRef.current);
      drawWheel(targetRotationRef.current);
      setSpinState('stopped');

      // Always calculate the winning segment from pointer position for consistency
      // In contract mode, the spin should have been calculated to land the correct segment under the pointer
      const finalSegment = getSegmentAtPointer(targetRotationRef.current);

      if (targetSegmentIndexRef.current !== undefined) {
        // Contract mode - log what we expected vs what we got
        const expectedSegment = WHEEL_SEGMENTS[targetSegmentIndexRef.current];
        console.log('🎯 Contract mode - Expected:', expectedSegment.value, 'Got:', finalSegment.value);
        if (expectedSegment.id !== finalSegment.id) {
          console.warn('⚠️  Segment mismatch! Expected segment', expectedSegment.id, 'but got segment', finalSegment.id);
        }
      }

      setWinningSegment(finalSegment);
      setHighlightOpacity(1); // Reset opacity

      // Start fade timer after 5 seconds
      highlightTimeoutRef.current = setTimeout(() => {
        // Fade over 2 seconds
        const fadeDuration = 2000; // 2 seconds
        const fadeSteps = 60; // 60 FPS
        const opacityStep = 1 / (fadeSteps * (fadeDuration / 1000));

        let currentOpacity = 1;
        fadeIntervalRef.current = setInterval(() => {
          currentOpacity -= opacityStep;
          if (currentOpacity <= 0) {
            currentOpacity = 0;
            setWinningSegment(null);
            setHighlightOpacity(1); // Reset for next time
            if (fadeIntervalRef.current) {
              clearInterval(fadeIntervalRef.current);
              fadeIntervalRef.current = undefined;
            }
          }
          setHighlightOpacity(currentOpacity);
        }, 1000 / fadeSteps);
      }, 5000); // Start fading after 5 seconds

      onSpinComplete(finalSegment);
    }
  }, [drawWheel, getSegmentAtPointer, onSpinComplete, playTick]);

  // Start spin
  const spin = useCallback((targetIndex?: number) => {
    if (spinState !== 'idle' && spinState !== 'stopped') return;

    // Stop idle animation if running
    stopIdleAnimation();

    // Clear any existing highlight timers
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = undefined;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = undefined;
    }

    setSpinState('spinning');
    setWinningSegment(null);
    setHighlightOpacity(1); // Reset opacity
    lastPegHitRef.current = -1; // Reset peg collision tracking
    lastProcessedTargetRef.current = undefined; // Reset for new spin
    onSpinStart?.();

    // Calculate target rotation
    const minSpins = PHYSICS.MIN_SPINS;
    const maxSpins = PHYSICS.MAX_SPINS;
    const randomSpins = minSpins + Math.random() * (maxSpins - minSpins);

    let targetSegmentIndex: number;
    if (targetIndex !== undefined) {
      // Contract mode - use predetermined result
      targetSegmentIndex = targetIndex;
      targetSegmentIndexRef.current = targetIndex; // Store for use in animate function
    } else {
      // Free play mode - random result
      targetSegmentIndex = Math.floor(Math.random() * TOTAL_SEGMENTS);
      targetSegmentIndexRef.current = undefined; // Clear for free play mode
    }

    // Calculate the rotation needed to land on the target segment
    // The wheel rotates clockwise. Pointer is at 270° (12 o'clock).
    // We want the CENTER of the target segment to be under the pointer
    let cumulativeAngle = 0;
    for (let i = 0; i < targetSegmentIndex; i++) {
      cumulativeAngle += WHEEL_SEGMENTS[i].arcLength;
    }
    const targetSegmentStartAngle = cumulativeAngle;
    const targetSegmentCenterAngle = targetSegmentStartAngle + WHEEL_SEGMENTS[targetSegmentIndex].arcLength / 2;

    // When wheel rotates by R degrees clockwise, segment at angle A moves to (A - R) mod 360°
    // We want target segment center under pointer: (targetSegmentCenterAngle - R) mod 360° = 270°
    // So: R = (targetSegmentCenterAngle - 270°) mod 360°
    const baseRotation = (targetSegmentCenterAngle - 270 + 360) % 360;

    // Debug logging (can be removed in production)
    if (targetSegmentIndex !== undefined) {
      console.log('🎯 Spin calculation:', {
        targetSegmentIndex,
        targetSegmentStartAngle,
        targetSegmentCenterAngle,
        baseRotation,
        totalRotation: rotationRef.current + (randomSpins * 360) + baseRotation
      });
    }

    // Total rotation = full spins + exact angle to target segment
    const totalRotation = rotationRef.current + (randomSpins * 360) + baseRotation;

    targetRotationRef.current = totalRotation;
    startRotationRef.current = rotationRef.current; // Store starting position
    spinDurationRef.current = PHYSICS.SPIN_DURATION_BASE + Math.random() * PHYSICS.SPIN_DURATION_VARIANCE;
    startTimeRef.current = performance.now();

    animationRef.current = requestAnimationFrame(animate);
  }, [spinState, animate, onSpinStart]);

  // Reset wheel
  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    // Clear any existing highlight timers
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = undefined;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = undefined;
    }
    setSpinState('idle');
    setWinningSegment(null);
    setHighlightOpacity(1);
    lastProcessedTargetRef.current = undefined; // Allow new spins to be triggered
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    spin,
    reset,
  }), [spin, reset]);

  // Initial draw
  useEffect(() => {
    drawWheel(currentRotation);
  }, [drawWheel, currentRotation]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = size;
      canvas.height = size;
      drawWheel(currentRotation);
    }
  }, [size, drawWheel, currentRotation]);

  // Handle external spin trigger
  useEffect(() => {
    console.log('🎡 Spin trigger check:', {
      isSpinning,
      spinState,
      targetSegment,
      lastProcessedTarget: lastProcessedTargetRef.current,
      'isSpinning type': typeof isSpinning,
      'targetSegment type': typeof targetSegment,
      'condition check': isSpinning && (spinState === 'idle' || spinState === 'stopped') && targetSegment !== undefined && targetSegment !== lastProcessedTargetRef.current
    });

    // Only trigger spin if we have a new target segment and wheel is ready
    if (isSpinning && (spinState === 'idle' || spinState === 'stopped') && targetSegment !== undefined && targetSegment !== lastProcessedTargetRef.current) {
      console.log('🎡 ✅ ALL CONDITIONS MET! Triggering wheel spin with target segment:', targetSegment);
      lastProcessedTargetRef.current = targetSegment; // Mark as processed
      spin(targetSegment);
    } else {
      if (!isSpinning) {
        console.log('🎡 ❌ Condition failed: isSpinning is false');
      }
      if (spinState !== 'idle' && spinState !== 'stopped') {
        console.log('🎡 ❌ Condition failed: spinState is', spinState, '(needs idle or stopped)');
      }
      if (targetSegment === undefined) {
        console.log('🎡 ❌ Condition failed: targetSegment is undefined');
      }
      if (targetSegment === lastProcessedTargetRef.current) {
        console.log('🎡 ❌ Condition failed: targetSegment already processed');
      }
    }
  }, [isSpinning, spinState, spin, targetSegment]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`${spinState === 'spinning' ? 'wheel-glow-spinning' : 'wheel-glow'}`}
        style={{ cursor: 'pointer' }}
      />
      {/* Winning overlay */}
      {winningSegment && spinState === 'stopped' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="win-banner px-6 py-4 rounded-xl"
            style={{
              background: 'linear-gradient(145deg, rgb(16, 26, 35), rgb(35, 36, 41))',
              boxShadow: 'inset 0 3px 6px rgba(0, 0, 0, 0.8), inset 0 -3px 6px rgba(255, 255, 255, 0.1), 0 4px 20px rgba(6, 182, 212, 0.3)',
              border: '2px solid rgba(6, 182, 212, 0.5)',
            }}
          >
            <div className="text-center">
              <div className="text-cyan-400 text-2xl font-bold mb-1">
                {winningSegment.value === 'JOKER' ? 'JOKER!' :
                 winningSegment.value === 'MORBIUS' ? 'MORBIUS!' :
                 winningSegment.value}
              </div>
              <div className="text-cyan-300/80 text-lg">
                {winningSegment.multiplier}x Multiplier
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

BigWheelGame.displayName = 'BigWheelGame';

export default BigWheelGame;
