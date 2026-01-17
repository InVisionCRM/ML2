'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { cn } from "@/lib/utils";

// Import Plinko ABI
import plinkoAbi from '@/abi/plinko.json';

// Plinko contract address
const PLINKO_CONTRACT = process.env.NEXT_PUBLIC_PLINKO_ADDRESS || '0x328F7Afefb8F561B5A832954257c01B3723054Fb';

import Footer from '@/components/PLINKO/Footer';

export default function PlinkoStatsPage() {
  const { address } = useAccount();
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(0);

  // Global Stats
  const { data: globalStats, isLoading: globalStatsLoading } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'getGlobalStats',
  });

  // Player Stats
  const { data: playerStats, isLoading: playerStatsLoading } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'getPlayerInfo',
    args: address ? [address] : undefined,
  });

  // Game Configuration
  const { data: ballPrice } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'getBallPrice',
  });

  const { data: contractReserve } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'getContractReserve',
  });

  const { data: maxBallPrice } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'maxBallPrice',
  });

  const { data: deployerRecipient } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'deployerRecipient',
  });

  const { data: isPaused } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'paused',
  });

  const { data: multipliers } = useReadContract({
    address: PLINKO_CONTRACT as `0x${string}`,
    abi: plinkoAbi,
    functionName: 'getBucketMultipliers',
    args: [selectedRiskLevel],
  });

  // Calculate derived stats
  const stats = globalStats as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const totalDrops = stats?.[0] ? Number(stats[0]) : 0;
  const totalBallsSold = stats?.[1] ? Number(stats[1]) : 0;
  const totalRevenue = stats?.[2] ? Number(stats[2]) / 1e18 : 0;
  const totalPayouts = stats?.[3] ? Number(stats[3]) / 1e18 : 0;
  const reserveBalance = stats?.[4] ? Number(stats[4]) / 1e18 : 0;

  const netProfit = totalRevenue - totalPayouts;
  const houseEdge = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const averagePayoutPerDrop = totalDrops > 0 ? totalPayouts / totalDrops : 0;

  // Player derived stats
  const playerData = playerStats as readonly [bigint, bigint, bigint, bigint, bigint] | undefined;
  const playerBallBalance = playerData?.[0] ? Number(playerData[0]) : 0;
  const playerTotalDrops = playerData?.[1] ? Number(playerData[1]) : 0;
  const playerTotalWon = playerData?.[2] ? Number(playerData[2]) / 1e18 : 0;
  const playerBiggestWin = playerData?.[3] ? Number(playerData[3]) / 1e18 : 0;
  const playerTotalPurchased = playerData?.[4] ? Number(playerData[4]) / 1e18 : 0;

  const playerNetProfit = playerTotalWon - playerTotalPurchased;
  const playerWinRate = playerTotalPurchased > 0 ? (playerTotalWon / playerTotalPurchased) * 100 : 0;
  const playerAveragePayout = playerTotalDrops > 0 ? playerTotalWon / playerTotalDrops : 0;

  const riskLevelNames = ['Low Risk', 'Medium Risk', 'High Risk'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 tracking-tight">
            Plinko Statistics
          </h1>
          <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto mb-6">
            Comprehensive analytics and performance metrics for the Plinko gaming platform
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-sm text-gray-500 mr-3 font-medium">Contract:</span>
            <code className="text-sm font-mono text-gray-900">{PLINKO_CONTRACT}</code>
          </div>
        </div>

        {/* Global Statistics Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-light text-gray-900 mb-8 border-b border-gray-200 pb-4">
            Global Performance Metrics
          </h2>

          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
            <StatCard
              title="Total Ball Drops"
              value={totalDrops.toLocaleString()}
              subtitle="All players combined"
              isLoading={globalStatsLoading}
            />
            <StatCard
              title="Total Balls Sold"
              value={totalBallsSold.toLocaleString()}
              subtitle="Purchase transactions"
              isLoading={globalStatsLoading}
            />
            <StatCard
              title="Total Revenue"
              value={Math.floor(totalRevenue).toLocaleString()}
              subtitle="Platform earnings"
              isLoading={globalStatsLoading}
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
            <StatCard
              title="Total Payouts"
              value={Math.floor(totalPayouts).toLocaleString()}
              subtitle="Player winnings"
              isLoading={globalStatsLoading}
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
            <StatCard
              title="Contract Reserve"
              value={Math.floor(reserveBalance).toLocaleString()}
              subtitle="Available for payouts"
              isLoading={globalStatsLoading}
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
            <StatCard
              title="Net Platform Profit"
              value={Math.floor(netProfit).toLocaleString()}
              subtitle="Revenue minus payouts"
              isLoading={globalStatsLoading}
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
            <StatCard
              title="House Edge"
              value={`${houseEdge.toFixed(2)}%`}
              subtitle="Platform advantage"
              isLoading={globalStatsLoading}
            />
            <StatCard
              title="Average Payout per Drop"
              value={averagePayoutPerDrop.toFixed(2)}
              subtitle="Mean winning amount"
              isLoading={globalStatsLoading}
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
          </div>
        </section>

        {/* Game Configuration Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-light text-gray-900 mb-8 border-b border-gray-200 pb-4">
            Game Configuration
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
            <StatCard
              title="Current Ball Price"
              value={Math.floor(Number(ballPrice || BigInt(0)) / 1e18).toLocaleString()}
              subtitle="Cost per ball"
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
            <StatCard
              title="Maximum Ball Price"
              value={Math.floor(Number(maxBallPrice || BigInt(0)) / 1e18).toLocaleString()}
              subtitle="Security limit"
              tokenIcon="/morbius/MorbiusLogo (3).png"
            />
            <StatCard
              title="Platform Fee"
              value="5.00%"
              subtitle="Deployer commission"
            />
            <StatCard
              title="Contract Status"
              value={isPaused ? "Paused" : "Active"}
              subtitle="Operational state"
              statusColor={isPaused ? "text-red-600" : "text-green-600"}
            />
          </div>
        </section>

        {/* Player Statistics Section */}
        {address && (
          <section className="mb-20">
            <h2 className="text-3xl font-light text-gray-900 mb-8 border-b border-gray-200 pb-4">
              Personal Performance
            </h2>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
              <div className="text-sm text-gray-500 mb-4 font-medium">Wallet Address</div>
              <div className="font-mono text-gray-900 break-all">{address}</div>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1">
              <StatCard
                title="Ball Balance"
                value={playerBallBalance.toLocaleString()}
                subtitle="Unused balls owned"
                isLoading={playerStatsLoading}
              />
              <StatCard
                title="Total Drops"
                value={playerTotalDrops.toLocaleString()}
                subtitle="Balls played"
                isLoading={playerStatsLoading}
              />
              <StatCard
                title="Total Winnings"
                value={Math.floor(playerTotalWon).toLocaleString()}
                subtitle="Lifetime payouts"
                isLoading={playerStatsLoading}
                tokenIcon="/morbius/MorbiusLogo (3).png"
              />
              <StatCard
                title="Biggest Win"
                value={Math.floor(playerBiggestWin).toLocaleString()}
                subtitle="Single largest payout"
                isLoading={playerStatsLoading}
                tokenIcon="/morbius/MorbiusLogo (3).png"
              />
              <StatCard
                title="Total Invested"
                value={Math.floor(playerTotalPurchased).toLocaleString()}
                subtitle="Lifetime spending"
                isLoading={playerStatsLoading}
                tokenIcon="/morbius/MorbiusLogo (3).png"
              />
              <StatCard
                title="Net Profit/Loss"
                value={Math.floor(playerNetProfit).toLocaleString()}
                subtitle="Winnings minus spending"
                isLoading={playerStatsLoading}
                statusColor={playerNetProfit >= 0 ? "text-green-600" : "text-red-600"}
                tokenIcon="/morbius/MorbiusLogo (3).png"
              />
              <StatCard
                title="Win Rate"
                value={`${playerWinRate.toFixed(2)}%`}
                subtitle="Return on investment"
                isLoading={playerStatsLoading}
              />
              <StatCard
                title="Average Payout"
                value={playerAveragePayout.toFixed(2)}
                subtitle="Per ball dropped"
                isLoading={playerStatsLoading}
                tokenIcon="/morbius/MorbiusLogo (3).png"
              />
            </div>
          </section>
        )}

        {!address && (
          <section className="mb-20">
            <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet</h3>
              <p className="text-gray-600">Connect your wallet to view personal statistics and performance metrics.</p>
            </div>
          </section>
        )}

        {/* Risk Level Multipliers Section */}
        <section className="mb-20">
          <h2 className="text-3xl font-light text-gray-900 mb-8 border-b border-gray-200 pb-4">
            Risk Level Configuration
          </h2>

          <div className="mb-8">
            <div className="flex flex-wrap gap-4">
              {[0, 1, 2].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedRiskLevel(level)}
                  className={cn(
                    "px-6 py-3 rounded-lg font-medium transition-all duration-200 border",
                    selectedRiskLevel === level
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                  )}
                >
                  {riskLevelNames[level]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-medium text-gray-900 mb-6">
              {riskLevelNames[selectedRiskLevel]} Multipliers
            </h3>

            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-15 gap-4">
              {(multipliers as readonly bigint[] | undefined)?.map((multiplier: bigint, index: number) => (
                <div key={index} className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="text-sm text-gray-500 font-medium mb-1">Bucket {index + 1}</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {(Number(multiplier) / 100).toFixed(1)}x
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {((Number(multiplier) / 100) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p>Each bucket represents a potential outcome when a ball drops. Higher risk levels offer larger potential multipliers but with increased volatility.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm border-t border-gray-200 pt-8 mt-16">
          <div className="inline-flex items-center px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg mb-4">
            <span className="text-sm text-gray-500 mr-3 font-medium">Contract Address:</span>
            <code className="text-sm font-mono text-gray-900">{PLINKO_CONTRACT}</code>
          </div>
          <p className="mt-4">Statistics are updated in real-time from the Plinko smart contract on PulseChain.</p>
          <p className="mt-2">All data is publicly verifiable on-chain.</p>
        </footer>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  isLoading?: boolean;
  statusColor?: string;
  tokenIcon?: string;
}

function StatCard({ title, value, subtitle, isLoading, statusColor, tokenIcon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200 aspect-square flex flex-col justify-center items-center text-center">
      <div className="flex flex-col items-center h-full justify-center">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2 flex-shrink-0">
          {title}
        </h3>
        <div className={cn(
          "text-2xl font-light text-gray-900 mb-2 flex items-center justify-center gap-2 flex-1",
          statusColor,
          isLoading && "animate-pulse text-gray-400"
        )}>
          {isLoading ? "—" : (
            <>
              {value}
              {tokenIcon && (
                <img
                  src={tokenIcon}
                  alt="Token icon"
                  className="w-6 h-6 object-contain flex-shrink-0"
                />
              )}
            </>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-400 font-medium flex-shrink-0">
            {subtitle}
          </p>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
