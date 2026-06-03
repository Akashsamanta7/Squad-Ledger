import React, { useState } from 'react';
import { Player } from '../types';
import { SUPPORTED_GAMES } from '../data';
import { PlusCircle, Info } from 'lucide-react';

interface AddTournamentFormProps {
  players: Player[];
  onAdd: (data: {
    name: string;
    game: string;
    date: string;
    entryFee: number;
    winnings: number;
    entryFeePayerId: string;
    winningsReceiverId: string;
    notes: string;
  }) => void;
}

export function AddTournamentForm({ players, onAdd }: AddTournamentFormProps) {
  const [name, setName] = useState('');
  const [game, setGame] = useState(SUPPORTED_GAMES[0]);
  const [customGame, setCustomGame] = useState('');
  // Use metadata current time: 2026-06-01
  const [date, setDate] = useState('2026-06-01');
  const [entryFee, setEntryFee] = useState<number | ''>('');
  const [winnings, setWinnings] = useState<number | ''>('');
  
  // Default to User (Usually first player, which is Akash 'p1')
  const defaultUser = players.find(p => p.isUser) || players[0];
  const [entryFeePayerId, setEntryFeePayerId] = useState(defaultUser?.id || '');
  const [winningsReceiverId, setWinningsReceiverId] = useState(defaultUser?.id || '');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tournament name is required');
      return;
    }
    setError('');

    const finalGameName = game === 'Other' && customGame.trim() ? customGame : game;
    
    onAdd({
      name: name.trim(),
      game: finalGameName,
      date,
      entryFee: Number(entryFee) || 0,
      winnings: Number(winnings) || 0,
      entryFeePayerId,
      winningsReceiverId,
      notes: notes.trim()
    });

    // Reset Form
    setName('');
    setEntryFee('');
    setWinnings('');
    setNotes('');
    setCustomGame('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl" id="add-tournament-form">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-md font-semibold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-cyan-400" /> Log New Tournament
        </h3>
        <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-2.5 py-0.5 rounded-full border border-cyan-800/30 font-semibold uppercase">
          Equal 4-Way Split
        </span>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs py-2 px-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tournament Name */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Tournament Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Free Fire Clash Squad Cup"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Selected Game (Disabled context layout) */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Active Game Mode
          </label>
          <div className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl px-3.5 py-2 text-sm text-cyan-400 font-bold font-mono">
            🔥 Free Fire (Default Mode)
          </div>
        </div>

        {/* Tournament Date */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Tournament Date
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Entry Fee (Charges) */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Total Squad Entry Charges (₹)
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={entryFee}
            onChange={(e) => setEntryFee(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Overall Tournament Winnings */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Total Squad Winnings (₹)
          </label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={winnings}
            onChange={(e) => setWinnings(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Entry Fee Payer */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Who paid the Entry Fee?
          </label>
          <select
            value={entryFeePayerId}
            onChange={(e) => setEntryFeePayerId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Winnings Recipient */}
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Who collected the Winnings?
          </label>
          <select
            value={winningsReceiverId}
            onChange={(e) => setWinningsReceiverId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notes (Full width) */}
        <div className="md:col-span-1">
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">
            Tournament Notes (optional)
          </label>
          <textarea
            rows={1}
            placeholder="e.g. Avi scored 11 kills, Booyah! 🔥"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 bg-cyan-950/20 border border-cyan-900/30 rounded-xl p-3 text-cyan-300 text-xs">
        <Info className="w-4.5 h-4.5 flex-shrink-0 text-cyan-400" />
        <p>
          Each player's shared liability: Entry share = 25% of total. Winnings share = 25% of total.
          Our ledger tracks exact credits/debts dynamically based on who actually completed the out-of-pocket transactions.
        </p>
      </div>

      <button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-600 to-sky-500 text-slate-950 font-bold py-2.5 rounded-xl hover:from-cyan-500 hover:to-sky-400 transition-all shadow-lg text-sm tracking-wide cursor-pointer"
      >
        Submit Tournament Entry
      </button>
    </form>
  );
}
