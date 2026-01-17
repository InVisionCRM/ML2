"use client";

import React, { useState, useEffect, useCallback, useImperativeHandle, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface BetDataPoint {
  dropNumber: number;
  betAmount: number;
  multiplier: number;
  bucketIndex: number;
  timestamp: number;
  profit: number;
  riskLevel: string;
}

interface RealTimeBetChartProps {
  sessionStartTime?: number;
  contractWagerPerBall?: number;
  freePlayWager?: number;
  onNewDataPoint?: (dataPoint: BetDataPoint) => void;
}

export interface RealTimeBetChartRef {
  addDataPoint: (multiplier: number, bucketIndex: number, contractData?: any) => void;
}

const RealTimeBetChart = React.forwardRef<RealTimeBetChartRef, RealTimeBetChartProps>(({
  sessionStartTime = Date.now(),
  contractWagerPerBall = 0,
  freePlayWager = 0,
  onNewDataPoint
}, ref) => {
  const [betHistory, setBetHistory] = useState<BetDataPoint[]>([]);
  const [currentStats, setCurrentStats] = useState({
    totalBets: 0,
    totalWagered: 0,
    totalWon: 0
  });

  // Function to add data points from external calls
  const addDataPoint = useCallback((multiplier: number, bucketIndex: number, contractData?: any) => {
    const betAmount = contractData ? contractWagerPerBall : freePlayWager;
    const riskLevel = contractData?.risk || 'UNKNOWN';

    const winAmount = betAmount * multiplier;
    const profit = winAmount - betAmount;

    const newDataPoint: BetDataPoint = {
      dropNumber: betHistory.length + 1,
      betAmount,
      multiplier,
      bucketIndex,
      timestamp: Date.now(),
      profit,
      riskLevel
    };

    setBetHistory(prev => [...prev, newDataPoint]);

    setCurrentStats(prev => ({
      totalBets: prev.totalBets + 1,
      totalWagered: prev.totalWagered + betAmount,
      totalWon: prev.totalWon + winAmount
    }));

    if (onNewDataPoint) {
      onNewDataPoint(newDataPoint);
    }
  }, [betHistory.length, contractWagerPerBall, freePlayWager, onNewDataPoint]);

  useImperativeHandle(ref, () => ({
    addDataPoint
  }), [addDataPoint]);

  // Clear history when session starts
  useEffect(() => {
    setBetHistory([]);
    setCurrentStats({
      totalBets: 0,
      totalWagered: 0,
      totalWon: 0
    });
  }, [sessionStartTime]);

  // Calculate cumulative P&L data
  const pnlData = useMemo(() => {
    let cumulativePnL = 0;

    return betHistory.map((point, index) => {
      cumulativePnL += point.profit;

      return {
        ...point,
        cumulativePnL,
        dropNumber: index + 1
      };
    });
  }, [betHistory]);

  // Calculate net P&L
  const netPnL = currentStats.totalWon - currentStats.totalWagered;
  const roi = currentStats.totalWagered > 0
    ? ((netPnL / currentStats.totalWagered) * 100).toFixed(1)
    : '0.0';


  // Calculate Y-axis domain to ensure zero is always visible
  const getYAxisDomain = () => {
    if (pnlData.length === 0) return [-100, 100];

    const values = pnlData.map(d => d.cumulativePnL);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);

    // Add 20% padding
    const padding = Math.max(Math.abs(max - min) * 0.1, 50);
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  };

  return (
    <div
      className="w-full h-full rounded-lg pt-1 pr-1 pb-0.5 pl-1"
      style={{
        background: 'linear-gradient(145deg,rgb(16, 26, 35),rgb(35, 36, 41))',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.8), inset 0 -2px 4px rgba(255, 255, 255, 0.1), 0 1px 2px rgba(0, 0, 0, 0.5)',
        border: '1px inset rgba(60, 60, 60, 0.5)',
      }}
    >
      {/* Header with Stats */}
      <div className="mb-1">
        <div className="grid grid-cols-3 items-center justify-center text-center">
          <div className="bg-gray-800/50 w-full px-1 py-1 rounded-tl-lg border-t border-b border-gray-700/50">
            <div className="text-cyan-300/80 text-[8px] uppercase tracking-wider">Drops</div>
            <div className="text-white font-bold text-sm text-center">{currentStats.totalBets}</div>
          </div>
          <div className="bg-gray-800/50 w-full px-1 py-1 border-t border-b border-gray-700/50">
            <div className="text-cyan-300/80 text-[8px] uppercase tracking-wider">Net P&L</div>
            <div className={`font-bold text-sm flex text-center justify-center items-center gap-0.5 ${netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netPnL >= 0 ? '+' : ''}{Math.round(netPnL)}
              <img
                src="/morbius/MorbiusLogo (3).png"
                alt="Morbius"
                className="w-4 h-4 object-contain"
              />
            </div>
          </div>
          <div className="bg-gray-800/50 w-full px-1 py-1 border-t border-b border-gray-700/50">
            <div className="text-cyan-300/80 text-[8px] uppercase tracking-wider">ROI</div>
            <div className={`font-bold text-sm ${parseFloat(roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {parseFloat(roi) >= 0 ? '+' : ''}{roi}%
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full">
        {betHistory.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-cyan-300/60">
              <p className="text-lg">P&L chart will appear</p>
              <p className="text-sm">after your first drop</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pnlData} margin={{ top: 0, right: 0, left: 0, bottom: 5 }}>
              <defs>
                {/* Green gradient for positive values */}
                <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.05}/>
                </linearGradient>
                {/* Red gradient for negative values */}
                <linearGradient id="negativeGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.05}/>
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />

              <XAxis
                dataKey="dropNumber"
                stroke="rgba(255,255,255,0.4)"
                fontSize={10}
                tick={{ fill: 'rgba(255,255,255,0.5)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.15)' }}
              />

              <YAxis
                stroke="rgba(255,255,255,0.4)"
                fontSize={10}
                tick={{ fill: 'rgba(255,255,255,0.5)' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                tickLine={{ stroke: 'rgba(255,255,255,0.15)' }}
                domain={getYAxisDomain()}
                tickFormatter={(value) => value >= 1000 || value <= -1000 ? `${(value/1000).toFixed(0)}k` : value}
              />


              {/* Zero reference line - break even */}
              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.4)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />

              {/* Positive area (above zero) */}
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#positiveGradient)"
                fillOpacity={1}
                baseValue={0}
                isAnimationActive={false}
                dot={false}
                activeDot={false}
              />

              {/* We need a second area for negative fills - using clip path trick */}
              <Area
                type="monotone"
                dataKey="cumulativePnL"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#negativeGradient)"
                fillOpacity={1}
                baseValue={0}
                isAnimationActive={false}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
});

RealTimeBetChart.displayName = 'RealTimeBetChart';

export { RealTimeBetChart, type BetDataPoint };
export default RealTimeBetChart;
