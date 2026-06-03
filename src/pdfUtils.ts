import { jsPDF } from 'jspdf';
import { MonthlyReport, Player, PlayerMonthSummary } from './types';
import { formatCurrency, formatMonthName } from './utils';

/**
 * Generates and downloads a beautiful monthly general ledger PDF report for the entire squad
 */
export function downloadMonthlySummaryPDF(report: MonthlyReport, players: Player[], month: string) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const titleMonth = formatMonthName(month);
  
  // Design Header Banner (Cyberpunk Dark Slate style)
  doc.setFillColor(10, 15, 29); // #0a0f1d
  doc.rect(0, 0, 210, 45, 'F');
  
  // Cyan Accent Line
  doc.setFillColor(14, 165, 233); // #0ea5e9
  doc.rect(0, 43, 210, 2, 'F');

  // Title Text inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('SQUAD SETTLE - FREE FIRE LEDGER', 15, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175);
  doc.text(`Official Esports League Account • Period: ${titleMonth}`, 15, 28);
  doc.text(`Calculated on billing cycle: 4-way balanced settlement division`, 15, 34);

  // Summary Metrics Section
  doc.setTextColor(15, 23, 42); // deep slate
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('I. GENERAL SQUAD METRICS', 15, 60);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 63, 195, 63);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);

  let y = 72;
  
  doc.text(`Total Free Fire Matches Logged:`, 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${report.tournaments.length}`, 95, y);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Gross Entry Charges Paid:`, 15, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(report.totalSquadEntryFees)} (Personal split: ${formatCurrency(report.totalSquadEntryFees / 4)} each)`, 95, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`Gross Prize Winnings Collected:`, 15, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(report.totalSquadWinnings)} (Personal share: ${formatCurrency(report.totalSquadWinnings / 4)} each)`, 95, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(`Squad Yield Margin Outcome:`, 15, y + 24);
  doc.setFont('helvetica', 'bold');
  const outcomeSign = report.netSquadOutcome >= 0 ? '+' : '';
  doc.text(`${outcomeSign}${formatCurrency(report.netSquadOutcome)} (${report.netSquadOutcome >= 0 ? 'TEAM PROFIT YIELD' : 'TEAM LOSS STATUS'})`, 95, y + 24);

  // Table header for Friend balances
  y += 40;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('II. INDIVIDUAL PLAYER OUTCOME SUMMARY', 15, y);
  doc.line(15, y + 3, 195, y + 3);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('PLAYER NICKNAME', 15, y);
  doc.text('ENTRY FEE SHARE (25%)', 62, y);
  doc.text('PRIZE RECEIVED SHARE', 108, y);
  doc.text('OUT OF POCKET DIRECT', 150, y);
  doc.text('CURRENT NET DUE', 188, y);

  doc.setLineWidth(0.2);
  doc.line(15, y + 2, 195, y + 2);

  y += 8;
  doc.setFont('helvetica', 'normal');
  report.playerSummaries.forEach(p => {
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(p.playerName, 15, y);
    
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(p.totalEntryFeeShare), 62, y);
    doc.text(formatCurrency(p.totalWinningsShare), 108, y);
    
    // out of pocket direct (Paid entries - received winnings)
    const directCashflow = p.actualPaidEntryShare - p.actualReceivedWinningsShare;
    const cashflowSign = directCashflow >= 0 ? '+' : '';
    doc.text(`${cashflowSign}${formatCurrency(directCashflow)}`, 150, y);

    if (p.isSettled) {
      doc.setTextColor(5, 150, 105); // emerald
      doc.text('SETTLED', 188, y, { align: 'right' });
    } else if (p.currentNetBalance < 0) {
      doc.setTextColor(225, 29, 72); // owes
      doc.text(`-${formatCurrency(Math.abs(p.currentNetBalance))}`, 188, y, { align: 'right' });
    } else {
      doc.setTextColor(14, 165, 233); // credit
      doc.text(`+${formatCurrency(Math.abs(p.currentNetBalance))}`, 188, y, { align: 'right' });
    }
    
    y += 8;
  });

  // Section III: Play log details
  y += 10;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('III. BILLING MATCH HISTORY LOGGER', 15, y);
  doc.line(15, y + 3, 195, y + 3);

  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('DATE', 15, y);
  doc.text('MATCH MATCH DESCRIPTION', 40, y);
  doc.text('ENTRY CHARGE (100%)', 105, y);
  doc.text('PRIZE CASH (100%)', 145, y);
  doc.text('ENTRY PAYER', 180, y);

  doc.line(15, y + 2, 195, y + 2);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  
  if (report.tournaments.length === 0) {
    doc.text('No matching active entries found for this month.', 15, y);
  } else {
    report.tournaments.forEach(t => {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.text(t.date, 15, y);
      
      const tNameTruncated = t.name.length > 25 ? t.name.substring(0, 23) + '..' : t.name;
      doc.setFont('helvetica', 'bold');
      doc.text(tNameTruncated, 40, y);
      
      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(t.entryFee), 105, y);
      doc.text(formatCurrency(t.winnings), 145, y);
      
      const payerObj = players.find(p => p.id === t.entryFeePayerId);
      const payerShort = payerObj ? payerObj.name.split(' ')[0] : 'Squad';
      doc.text(payerShort, 180, y);
      
      y += 8;
    });
  }

  // Footer stamp
  y += 15;
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, 195, y);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via Squad Settle (Free Fire PWA tracker). Audit-ready mathematically balanced ledger proof.', 15, y);

  doc.save(`Squad_Settle_Sheet_${month}.pdf`);
}

/**
 * Generates and downloads a personal monthly slip PDF report for a single friend
 */
export function downloadIndividualReportPDF(
  playerSummary: PlayerMonthSummary,
  userPlayer: Player,
  month: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const titleMonth = formatMonthName(month);
  
  // Design Header Banner (Indigo styled high-contrast header)
  doc.setFillColor(30, 27, 75); // #1e1b4b
  doc.rect(0, 0, 210, 45, 'F');
  
  // Neon Violet Accent Strip
  doc.setFillColor(139, 92, 246); // #8b5cf6
  doc.rect(0, 43, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('INDIVIDUAL SETTLEMENT STATEMENT', 15, 20);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(196, 181, 253);
  doc.text(`Player: ${playerSummary.playerName} • Account period: ${titleMonth}`, 15, 28);
  doc.text(`Generated on behalf of ${userPlayer.name}`, 15, 34);

  // Financial Breakdown Heading
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('I. ACTION ACCOUNT DETAILS & ANALYSIS', 15, 60);
  doc.line(15, 63, 195, 63);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);

  let y = 72;
  
  doc.text(`Matches Entered This Cycle:`, 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${playerSummary.tournamentCount}`, 125, y);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Your split share (25%) of Entry Costs:`, 15, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(playerSummary.totalEntryFeeShare)}`, 125, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`Your split share (25%) of Rewards Won:`, 15, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(playerSummary.totalWinningsShare)}`, 125, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(`Your fair net outcome (earnings minus entry costs):`, 15, y + 24);
  doc.setFont('helvetica', 'bold');
  const outcomeSign = playerSummary.netOutcomeShare >= 0 ? '+' : '';
  doc.text(`${outcomeSign}${formatCurrency(playerSummary.netOutcomeShare)}`, 125, y + 24);

  // Section II: Out-of-pocket & Credits
  y += 38;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('II. OUT-OF-POCKET CASHFLOW & OFFSET CREDITS', 15, y);
  doc.line(15, y + 3, 195, y + 3);

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105);

  doc.text(`Direct Cash Out-Of-Pocket (Paid matches):`, 15, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(playerSummary.actualPaidEntryShare)}`, 130, y);

  doc.setFont('helvetica', 'normal');
  doc.text(`Direct Prizes Cash Handed-To-You (In-hand):`, 15, y + 8);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(playerSummary.actualReceivedWinningsShare)}`, 130, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.text(`UPI/GPay Settlements PAID directly by You:`, 15, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(playerSummary.manualPaymentsSent)}`, 130, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.text(`UPI/GPay Settlements RECEIVED directly by You:`, 15, y + 24);
  doc.setFont('helvetica', 'bold');
  doc.text(`${formatCurrency(playerSummary.manualPaymentsReceived)}`, 130, y + 24);

  // Section III: Final Monthly Settlement status
  y += 38;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('III. FINAL REMAINING BALANCE PAYOUT', 15, y);
  doc.line(15, y + 3, 195, y + 3);

  y += 12;
  doc.setFillColor(248, 250, 252); // soft card grey
  doc.rect(15, y, 180, 25, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(15, y, 180, 25, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  if (playerSummary.isSettled) {
    doc.setTextColor(5, 150, 105); // emerald
    doc.text('BALANCE STATUS: FULLY RECONCILED (ZERO DUES!) ✓', 20, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`All games and manual payouts successfully split. No dues remaining with ${userPlayer.name}.`, 20, y + 17);
  } else if (playerSummary.currentNetBalance < 0) {
    doc.setTextColor(225, 29, 72); // owes
    doc.text(`BALANCE STATUS: ACTION REQUIRED (OUTSTANDING LIABILITY)`, 20, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`You owe to ${userPlayer.name}: ${formatCurrency(Math.abs(playerSummary.currentNetBalance))} (Initiate UPI)`, 20, y + 17);
  } else {
    doc.setTextColor(14, 165, 233); // represents user owing them
    doc.text(`BALANCE STATUS: REFUND INITIATION DUE BY LEADER`, 20, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${userPlayer.name} owes You: ${formatCurrency(Math.abs(playerSummary.currentNetBalance))} (Expect transfer)`, 20, y + 17);
  }

  // Bottom text instructions
  y += 40;
  doc.line(15, y, 195, y);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`This statement acts as permanent accounting proof for Free Fire tournament division. Clear dues swiftly.`, 15, y);

  doc.save(`FreeFire_Settlement_${playerSummary.playerName}_${month}.pdf`);
}
