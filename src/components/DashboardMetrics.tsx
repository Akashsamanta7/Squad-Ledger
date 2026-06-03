import React from 'react';
import { Target, TrendingUp, TrendingDown, DollarSign, Award, CreditCard } from 'lucide-react';
import { MonthlyReport } from '../types';
import { formatCurrency } from '../utils';

interface DashboardMetricsProps {
  report: MonthlyReport;
  userPlayerId: string;
}

export function DashboardMetrics({ report, userPlayerId }: DashboardMetricsProps) {
  const { totalSquadEntryFees, totalSquadWinnings, netSquadOutcome, playerSummaries } = report;
  
  // Find user summary
  const userSummary = playerSummaries.find(p => p.playerId === userPlayerId);
  
  // Calculate what others owe to user (Akash) or what user owes to others
  // Let's sum up currentNetBalance of non-user players.
  // In our ledger, a positive currentNetBalance for player P means "User owes Player P".
  // A negative currentNetBalance means "Player P owes User".
  // So:
  // - If Rohan has -200: Rohan owes user 200.
  // - If Sania has +100: User owes Sania 100.
  // Total to collect = sum of positive debts owed to Akash (where friend's balance is negative)
  // Total to distribute = sum of positive debts owed by Akash (where friend's balance is positive)
  let totalToCollect = 0;
  let totalToDistribute = 0;
  
  playerSummaries.forEach(p => {
    if (p.playerId !== userPlayerId) {
      if (p.currentNetBalance < 0) {
        totalToCollect += Math.abs(p.currentNetBalance);
      } else {
        totalToDistribute += p.currentNetBalance;
      }
    }
  });

  const overallUserNet = totalToCollect - totalToDistribute;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* Metric 1 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex items-start justify-between shadow-xl" id="metric-tournaments">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs font-mono uppercase tracking-wider mb-1">Squad Tourneys</p>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
            {report.tournaments.length}
          </h3>
          <p className="text-[10px] md:text-xs text-slate-500">Played this month</p>
        </div>
        <div className="bg-cyan-500/10 p-1.5 md:p-2 rounded-xl text-cyan-400">
          <Target className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>

      {/* Metric 2 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex items-start justify-between shadow-xl" id="metric-entry-fees">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs font-mono uppercase tracking-wider mb-1">Squad Costs</p>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
            {formatCurrency(totalSquadEntryFees)}
          </h3>
          <p className="text-[10px] md:text-xs text-slate-500">Split: {formatCurrency(totalSquadEntryFees / 4)} each</p>
        </div>
        <div className="bg-amber-500/10 p-1.5 md:p-2 rounded-xl text-amber-400">
          <CreditCard className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>

      {/* Metric 3 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex items-start justify-between shadow-xl" id="metric-winnings">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs font-mono uppercase tracking-wider mb-1">Squad Winnings</p>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1">
            {formatCurrency(totalSquadWinnings)}
          </h3>
          <p className="text-[10px] md:text-xs text-slate-500">Share: {formatCurrency(totalSquadWinnings / 4)} each</p>
        </div>
        <div className="bg-emerald-500/10 p-1.5 md:p-2 rounded-xl text-emerald-400">
          <Award className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>

      {/* Metric 4 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex items-start justify-between shadow-xl" id="metric-squad-net">
        <div>
          <p className="text-slate-400 text-[10px] md:text-xs font-mono uppercase tracking-wider mb-1">Squad Yield</p>
          <h3 className={`text-2xl md:text-3xl font-bold tracking-tight mb-1 ${netSquadOutcome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netSquadOutcome >= 0 ? '+' : ''}{formatCurrency(netSquadOutcome)}
          </h3>
          <div className="flex items-center gap-1">
            {netSquadOutcome >= 0 ? (
              <span className="text-emerald-500 text-[10px] md:text-xs flex items-center font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> Profit Zone
              </span>
            ) : (
              <span className="text-rose-500 text-[10px] md:text-xs flex items-center font-semibold">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> Loss state
              </span>
            )}
          </div>
        </div>
        <div className={`p-1.5 md:p-2 rounded-xl ${netSquadOutcome >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          <DollarSign className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>

      {/* Metric 5: Akash's Month-End Settlement Position */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 flex items-start justify-between shadow-xl col-span-2 lg:col-span-1" id="metric-user-settlements">
        <div>
          <p className="text-cyan-400 text-[10px] md:text-xs font-mono uppercase tracking-wider mb-1">Your Net Balance</p>
          <h3 className={`text-2xl md:text-3xl font-bold tracking-tight mb-1 ${overallUserNet === 0 ? 'text-slate-400' : overallUserNet > 0 ? 'text-cyan-400' : 'text-purple-400'}`}>
            {overallUserNet > 0 ? 'Collect ' : overallUserNet < 0 ? 'Pay ' : ''}{formatCurrency(Math.abs(overallUserNet))}
          </h3>
          <p className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1.5 mt-1">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
            To Collect: {formatCurrency(totalToCollect)}
          </p>
          <p className="text-[10px] md:text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-1.5 h-1.5 bg-rose-400 rounded-full"></span>
            To Pay: {formatCurrency(totalToDistribute)}
          </p>
        </div>
        <div className="bg-cyan-500/10 p-1.5 md:p-2 rounded-xl text-cyan-400">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>
    </div>
  );
}
