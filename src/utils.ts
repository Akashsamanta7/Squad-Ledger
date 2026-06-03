import { Tournament, Payment, Player, MonthlyReport, PlayerMonthSummary } from './types';

/**
 * Extracts all unique months (YYYY-MM) from tournaments and payments
 */
export function getAvailableMonths(tournaments: Tournament[], payments: Payment[]): string[] {
  const months = new Set<string>();
  
  tournaments.forEach(t => {
    if (t.date && t.date.length >= 7) {
      months.add(t.date.substring(0, 7));
    }
  });
  
  payments.forEach(p => {
    if (p.month) {
      months.add(p.month);
    }
  });

  // Always include the current calendar month so a fresh tab is automatically available on the 1st of every month
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  months.add(`${YYYY}-${MM}`);

  return Array.from(months).sort().reverse();
}

/**
 * Calculates a complete ledger report for a given month
 */
export function generateMonthlyReport(
  month: string,
  players: Player[],
  tournaments: Tournament[],
  payments: Payment[]
): MonthlyReport {
  // Filter tournaments occurring in this month
  const monthTournaments = tournaments.filter(t => t.date && t.date.startsWith(month));
  
  // Filter manual payments allocated to this month
  const monthPayments = payments.filter(p => p.month === month);

  // Totals for the whole team
  let totalSquadEntryFees = 0;
  let totalSquadWinnings = 0;

  monthTournaments.forEach(t => {
    totalSquadEntryFees += t.entryFee;
    totalSquadWinnings += t.winnings;
  });

  const netSquadOutcome = totalSquadWinnings - totalSquadEntryFees;

  // Let's create summaries for each of the 4 players
  const playerSummaries: PlayerMonthSummary[] = players.map(player => {
    let tournamentCount = 0;
    let totalEntryFeeShare = 0;
    let totalWinningsShare = 0;
    let actualPaidEntryShare = 0;
    let actualReceivedWinningsShare = 0;

    // 1. Accumulate shares from tournaments
    monthTournaments.forEach(t => {
      tournamentCount++;
      // Each player represents a 25% share (1 of 4 team members)
      totalEntryFeeShare += t.entryFee / 4;
      totalWinningsShare += t.winnings / 4;

      // Track who actually physically paid/received the cash
      if (t.entryFeePayerId === player.id) {
        actualPaidEntryShare += t.entryFee;
      }
      if (t.winningsReceiverId === player.id) {
        actualReceivedWinningsShare += t.winnings;
      }
    });

    // Net Outcome of their share (Winnings Share - Entry Fee Share)
    const netOutcomeShare = totalWinningsShare - totalEntryFeeShare;

    // 2. Accumulate manual database payments for settlements in this month
    const manualPaymentsSent = monthPayments
      .filter(p => p.fromPlayerId === player.id)
      .reduce((sum, p) => sum + p.amount, 0);

    const manualPaymentsReceived = monthPayments
      .filter(p => p.toPlayerId === player.id)
      .reduce((sum, p) => sum + p.amount, 0);

    // 3. Mathematical Ledger Balance:
    // How much cash should they have under a balanced split vs what they have physically in-hand?
    const fairCapitalExpected = totalWinningsShare - totalEntryFeeShare;
    const physicalCapitalReceived = actualReceivedWinningsShare - actualPaidEntryShare;
    
    // Difference is what they are owed (positive) or what they owe (negative) before manual adjustments
    const baseSettlementBalance = fairCapitalExpected - physicalCapitalReceived;

    // Let's adjust for external settlement payments:
    // If Rohan owes Akash 100, and Rohan SENDS a payment, Rohan's cash position goes down, balancing his debt.
    // So: currentNetBalance = baseSettlementBalance - (manualPaymentsReceived - manualPaymentsSent)
    // Let's verify:
    // Rohan has baseSettlementBalance = -100 (he owes Akash 100).
    // Rohan SENDS 100 to Akash.
    // manualPaymentsSent by Rohan = 100. manualPaymentsReceived = 0.
    // Net balance = -100 - (0 - 100) = 0. Fully settled! Correct!
    // Akash has baseSettlementBalance = +300 (Akash is owed 300).
    // Rohan SENDS 100 to Akash.
    // manualPaymentsReceived by Akash = 100.
    // Akash's net balance = +300 - (100 - 0) = +200. (Akash is now owed only 200). Correct!
    const currentNetBalance = baseSettlementBalance - (manualPaymentsReceived - manualPaymentsSent);

    // Consider settled if close to 0 (tolerance of 0.01)
    const isSettled = Math.abs(currentNetBalance) < 0.1;

    return {
      playerId: player.id,
      playerName: player.name,
      tournamentCount,
      totalEntryFeeShare,
      totalWinningsShare,
      netOutcomeShare,
      actualPaidEntryShare,
      actualReceivedWinningsShare,
      startingDebt: 0, // Placeholder for carryovers if expanded
      manualPaymentsSent,
      manualPaymentsReceived,
      currentNetBalance,
      isSettled
    };
  });

  return {
    month,
    tournaments: monthTournaments,
    payments: monthPayments,
    totalSquadEntryFees,
    totalSquadWinnings,
    netSquadOutcome,
    playerSummaries
  };
}

/**
 * Format currency comfortably for display (e.g. ₹ or $ or points)
 */
export function formatCurrency(amount: number): string {
  // Check if amount is integer, otherwise keep 2 decimal places
  const isInt = amount % 1 === 0;
  return '₹' + (isInt ? amount.toFixed(0) : amount.toFixed(2));
}

/**
 * Format month string e.g. "2026-06" to "June 2026"
 */
export function formatMonthName(monthStr: string): string {
  if (!monthStr || monthStr.length < 7) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${monthNames[monthIdx]} ${year}`;
  }
  return monthStr;
}
