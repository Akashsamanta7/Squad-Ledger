import React, { useState } from 'react';
import { PlayerMonthSummary, Player } from '../types';
import { formatCurrency, formatMonthName } from '../utils';
import { downloadIndividualReportPDF } from '../pdfUtils';
import { FileDown, ShieldAlert, CheckCircle2, ChevronRight, Share2, CornerDownRight, Landmark } from 'lucide-react';

interface PlayerCardProps {
  key?: string;
  summary: PlayerMonthSummary;
  userPlayer: Player;
  month: string;
  onInstantSettle: (fromId: string, toId: string, amount: number) => void;
}

export function PlayerCard({ summary, userPlayer, month, onInstantSettle }: PlayerCardProps) {
  const {
    playerId,
    playerName,
    tournamentCount,
    totalEntryFeeShare,
    totalWinningsShare,
    netOutcomeShare,
    currentNetBalance,
    isSettled,
  } = summary;

  const [copied, setCopied] = useState(false);

  const handleDownloadPDF = () => {
    downloadIndividualReportPDF(summary, userPlayer, month);
  };

  // Generate Transparency Report and Copy to Clipboard
  const handleShareReport = () => {
    const formattedMonth = formatMonthName(month);
    let settlementStatus = '';

    if (isSettled) {
      settlementStatus = `✅ STATUS: All accounts fully settled for ${formattedMonth}. No dues outstanding!`;
    } else if (currentNetBalance < 0) {
      // Teammate owes Akash
      settlementStatus = `💸 DUE BALANCE: ${playerName} owes ${userPlayer.name} ${formatCurrency(Math.abs(currentNetBalance))}`;
    } else {
      // Akash owes Teammate
      settlementStatus = `💸 DUE BALANCE: ${userPlayer.name} owes ${playerName} ${formatCurrency(Math.abs(currentNetBalance))}`;
    }

    const reportText = `🏆 *Esports Tournament Settlement Report - ${formattedMonth}* 🏆
👥 *Player*: ${playerName}
🎮 *Tournaments Played*: ${tournamentCount}

----------------------------------------
🎟️ *Your Entry Fee Share (25% of squad total)*: ${formatCurrency(totalEntryFeeShare)}
💰 *Your Prize Winnings Share (25% of squad total)*: ${formatCurrency(totalWinningsShare)}
📈 *Your Fair Share Outcome*: ${netOutcomeShare >= 0 ? '+' : ''}${formatCurrency(netOutcomeShare)}

🏦 *Account Adjustments*:
• Your physical payments sent/received already factored in.
----------------------------------------
${settlementStatus}

*Thank you for playing, squad up!* 🎮🎮`;

    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleInstantSettleClick = () => {
    if (currentNetBalance < 0) {
      // Friend owes user (Akash). Settle means Friend (from) pays User (to)
      onInstantSettle(playerId, userPlayer.id, Math.abs(currentNetBalance));
    } else if (currentNetBalance > 0) {
      // User (Akash) owes Friend. Settle means User (from) pays Friend (to)
      onInstantSettle(userPlayer.id, playerId, Math.abs(currentNetBalance));
    }
  };

  return (
    <div className={`relative bg-slate-900 border overflow-hidden rounded-2xl transition-all duration-300 p-5 flex flex-col justify-between shadow-lg ${
      isSettled 
        ? 'border-slate-800 hover:border-slate-700/60' 
        : currentNetBalance < 0
          ? 'border-rose-950/40 hover:border-rose-900/40 bg-gradient-to-br from-slate-900 to-rose-950/5'
          : 'border-cyan-950/40 hover:border-cyan-900/40 bg-gradient-to-br from-slate-900 to-cyan-950/5'
    }`} id={`player-card-${playerId}`}>
      
      {/* Card Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-mono text-sm ${
              isSettled 
                ? 'bg-slate-800 text-slate-300 border border-slate-700' 
                : currentNetBalance < 0 
                  ? 'bg-rose-950 text-rose-400 border border-rose-800/30' 
                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800/30'
            }`}>
              {playerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                {playerName}
              </h4>
              <span className="text-[10px] font-mono text-slate-400">{tournamentCount} tournament{tournamentCount === 1 ? '' : 's'}</span>
            </div>
          </div>

          {/* Status Badge */}
          {isSettled ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-800/20 px-2.5 py-0.5 rounded-full shadow-inner">
              <CheckCircle2 className="w-3 h-3" /> SETTLED
            </span>
          ) : currentNetBalance < 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold font-mono text-rose-400 bg-rose-950/30 border border-rose-800/20 px-2.5 py-0.5 rounded-full shadow-inner">
              <ShieldAlert className="w-3 h-3" /> OWES YOU
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-semibold font-mono text-cyan-400 bg-cyan-950/30 border border-cyan-800/20 px-2.5 py-0.5 rounded-full shadow-inner">
              <Landmark className="w-3 h-3" /> YOU OWE
            </span>
          )}
        </div>

        {/* Breakdown Values */}
        <div className="space-y-2 border-t border-b border-slate-800/60 py-3.5 my-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Entry Share (25%):</span>
            <span className="font-mono text-slate-200">{formatCurrency(totalEntryFeeShare)}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Prize Winnings (25%):</span>
            <span className="font-mono text-slate-200">{formatCurrency(totalWinningsShare)}</span>
          </div>
          <div className="flex items-center justify-between text-xs pt-1 border-t border-dashed border-slate-800">
            <span className="text-slate-400">Fair Net Outcome:</span>
            <span className={`font-mono font-semibold ${netOutcomeShare >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netOutcomeShare >= 0 ? '+' : ''}{formatCurrency(netOutcomeShare)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer: Live Balance and Action Elements */}
      <div className="mt-2 space-y-3">
        {/* Settlement Balance Status Indicator */}
        <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
          isSettled
            ? 'bg-slate-950/40 border-slate-800/40 text-slate-400'
            : currentNetBalance < 0
              ? 'bg-rose-950/10 border-rose-950/40 text-rose-300'
              : 'bg-cyan-950/10 border-cyan-950/40 text-cyan-300'
        }`}>
          <CornerDownRight className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            isSettled ? 'text-slate-500' : currentNetBalance<0 ? 'text-rose-400' : 'text-cyan-400'
          }`} />
          <div className="text-xs">
            <p className="font-mono font-bold text-slate-50">
              {isSettled
                ? 'Accounts perfectly balanced!'
                : currentNetBalance < 0
                  ? `${playerName} owes you ${formatCurrency(Math.abs(currentNetBalance))}`
                  : `You owe ${playerName} ${formatCurrency(Math.abs(currentNetBalance))}`
              }
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isSettled 
                ? 'No money transfer required.' 
                : 'Accumulated from tournament splits.'
              }
            </p>
          </div>
        </div>

        {/* Buttons Split Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Share Audit Report button */}
          <button
            onClick={handleShareReport}
            type="button"
            className="flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs py-2 rounded-xl transition-all cursor-pointer font-medium"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            {copied ? 'Copied! ✅' : 'Share Report'}
          </button>

          {/* Quick settle button */}
          <button
            onClick={handleInstantSettleClick}
            disabled={isSettled}
            type="button"
            className={`flex items-center justify-center gap-1.5 text-xs py-2 rounded-xl transition-all font-bold ${
              isSettled
                ? 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                : currentNetBalance < 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-slate-950 cursor-pointer'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 cursor-pointer'
            }`}
          >
            Settle Up
          </button>
        </div>

        {/* PDF statement download button */}
        <button
          onClick={handleDownloadPDF}
          type="button"
          className="w-full flex items-center justify-center gap-1.5 bg-indigo-950/20 hover:bg-indigo-900/40 border border-indigo-900/30 text-indigo-300 text-xs py-2.5 rounded-xl transition-all cursor-pointer font-medium mt-1"
        >
          <FileDown className="w-4 h-4 text-indigo-400" />
          Download PDF Statement
        </button>
      </div>
    </div>
  );
}
