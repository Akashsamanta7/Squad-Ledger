import React, { useState } from 'react';
import { Player } from '../types';
import { CreditCard, Info } from 'lucide-react';

interface AddPaymentFormProps {
  players: Player[];
  activeMonths: string[];
  currentMonth: string;
  onAdd: (data: {
    fromPlayerId: string;
    toPlayerId: string;
    amount: number;
    date: string;
    month: string;
    notes: string;
  }) => void;
}

export function AddPaymentForm({ players, activeMonths, currentMonth, onAdd }: AddPaymentFormProps) {
  const [fromPlayerId, setFromPlayerId] = useState(players[1]?.id || ''); // default to 1st friend
  const [toPlayerId, setToPlayerId] = useState(players[0]?.id || '');     // default to user (Akash)
  const [amount, setAmount] = useState<number | ''>('');
  // Use metadata current time: 2026-06-01
  const [date, setDate] = useState('2026-06-01');
  const [month, setMonth] = useState(currentMonth);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please specify a valid payment amount greater than 0.');
      return;
    }
    if (fromPlayerId === toPlayerId) {
      setError('Payer and Recipient must be different players.');
      return;
    }
    setError('');

    onAdd({
      fromPlayerId,
      toPlayerId,
      amount: Number(amount),
      date,
      month,
      notes: notes.trim()
    });

    setAmount('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl" id="add-payment-form">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-md font-semibold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" /> Record Settlement Cash
        </h3>
        <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-800/30 font-semibold uppercase">
          Ledger Settle
        </span>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2 px-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* From Player (Payer) */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Payer (Who Paid)
          </label>
          <select
            value={fromPlayerId}
            onChange={(e) => setFromPlayerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* To Player (Recipient) */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Recipient (Who Received)
          </label>
          <select
            value={toPlayerId}
            onChange={(e) => setToPlayerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cash Amount */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Payment Amount (₹) *
          </label>
          <input
            type="number"
            min="1"
            required
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Date of Payment */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Payment Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Month Allocation */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Allocate to Month's Tab
          </label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          >
            {activeMonths.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Notes (Full width) */}
        <div className="md:col-span-1">
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Reference / Notes (optional)
          </label>
          <input
            type="text"
            placeholder="e.g. GPay ref 44321, UPI transfer"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-950/40 rounded-xl p-3 text-emerald-300 text-xs text-balance">
        <Info className="w-4.5 h-4.5 flex-shrink-0 text-emerald-400" />
        <p>
          Manually keying in UPI or hand-to-hand payments immediately offsets that player's outstanding balance for the selected billing month.
        </p>
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-slate-950 font-bold py-2.5 rounded-xl hover:from-emerald-500 hover:to-teal-400 transition-all shadow-lg text-sm tracking-wide cursor-pointer"
      >
        Record Cash Settlement
      </button>
    </form>
  );
}
