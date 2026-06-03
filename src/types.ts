export interface Player {
  id: string;
  name: string;
  isUser: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  game: string;
  entryFee: number; // Total tournament entry fee paid
  winnings: number; // Total tournament winnings received
  entryFeePayerId: string; // Player who paid the entry charge
  winningsReceiverId: string; // Player who collected the winnings
  notes?: string;
}

export interface Payment {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM (e.g. "2026-06") to allocate this payment to a month's settlement
  notes?: string;
}

export interface PlayerMonthSummary {
  playerId: string;
  playerName: string;
  tournamentCount: number;
  totalEntryFeeShare: number; // Player's 25% share of total entry fees
  totalWinningsShare: number;  // Player's 25% share of total winnings
  netOutcomeShare: number;     // totalWinningsShare - totalEntryFeeShare (positive means net profit, negative means net loss)
  actualPaidEntryShare: number; // Amount player physically paid as entry fee (usually 0 for non-users if user paid everything)
  actualReceivedWinningsShare: number; // Amount player physically received as winnings (usually 0 for non-users if user received everything)
  
  // Ledger-based net settlement debt
  // Calculation: What they are owed minus what they owe (combining tournament payments and manual transfers)
  startingDebt: number; // Carried over
  manualPaymentsSent: number; // Payments they made to settle
  manualPaymentsReceived: number; // Payments they received to settle
  currentNetBalance: number; // Final amount: Positive (User owes them), Negative (They owe User)
  isSettled: boolean; // Flag if currentNetBalance is 0 (or close to it)
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  tournaments: Tournament[];
  payments: Payment[];
  totalSquadEntryFees: number;
  totalSquadWinnings: number;
  netSquadOutcome: number; // positive = profit, negative = loss
  playerSummaries: PlayerMonthSummary[];
}
