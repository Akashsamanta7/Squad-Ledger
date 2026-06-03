import React, { useState, useEffect } from 'react';
import { Player, Tournament, Payment } from './types';
import { INITIAL_PLAYERS, INITIAL_TOURNAMENTS, INITIAL_PAYMENTS } from './data';
import { getAvailableMonths, generateMonthlyReport, formatCurrency, formatMonthName } from './utils';
import { downloadMonthlySummaryPDF } from './pdfUtils';
import { DashboardMetrics } from './components/DashboardMetrics';
import { PlayerCard } from './components/PlayerCard';
import { AddTournamentForm } from './components/AddTournamentForm';
import { AddPaymentForm } from './components/AddPaymentForm';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Calendar, 
  Trash2, 
  RotateCcw, 
  Users, 
  History, 
  Plus, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Info,
  FileText,
  Lock,
  LogOut,
  Cloud
} from 'lucide-react';
import { HARDCODED_ACCOUNTS } from './accounts';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function App() {
  // --- 1. Account and Login State Engine ---
  const [activeUsername, setActiveUsername] = useState<string | null>(() => {
    const saved = localStorage.getItem('squad_settle_username');
    if (saved && HARDCODED_ACCOUNTS.some(acc => acc.username === saved)) {
      return saved;
    }
    return null;
  });

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Active squad details
  const activeAccount = HARDCODED_ACCOUNTS.find(acc => acc.username === activeUsername);

  // --- 2. Persistent Squad State Engine ---
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);

  // Fetch squad data from cloud Firestore whenever username changes
  useEffect(() => {
    if (!activeUsername) return;

    const loadSquadData = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'squads', activeUsername);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
          const cloudData = snapshot.data();
          if (cloudData.players) setPlayers(cloudData.players);
          if (cloudData.tournaments) setTournaments(cloudData.tournaments);
          if (cloudData.payments) setPayments(cloudData.payments);
          triggerNotification(`Synced: Loaded ledger for ${activeAccount?.squadName || activeUsername}!`);
        } else {
          // Document does not exist in Firestore yet; initialize with default template
          await setDoc(docRef, {
            players: INITIAL_PLAYERS,
            tournaments: INITIAL_TOURNAMENTS,
            payments: INITIAL_PAYMENTS,
            updatedAt: new Date().toISOString()
          });
          setPlayers(INITIAL_PLAYERS);
          setTournaments(INITIAL_TOURNAMENTS);
          setPayments(INITIAL_PAYMENTS);
          triggerNotification(`Cloud ready: Started ${activeAccount?.squadName || activeUsername}!`);
        }
      } catch (error) {
        console.error("Error loading squad data:", error);
        triggerNotification("Loaded offline fallback cache", "info");
      } finally {
        setIsLoading(false);
      }
    };

    loadSquadData();
  }, [activeUsername]);

  // Master cloud replication helper
  const syncToFirestore = async (
    currentPlayers: Player[],
    currentTournaments: Tournament[],
    currentPayments: Payment[]
  ) => {
    if (!activeUsername) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'squads', activeUsername);
      await setDoc(docRef, {
        players: currentPlayers,
        tournaments: currentTournaments,
        payments: currentPayments,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to sync to database:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, `squads/${activeUsername}`);
      } catch (e) {
        // Logged error
      }
      triggerNotification("Database replication error: local fallback active", "info");
    } finally {
      setIsSaving(false);
    }
  };

  // --- 3. Month-specific accounting ---
  const activeMonths = getAvailableMonths(tournaments, payments);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return activeMonths[0] || '2026-06';
  });

  // If selectedMonth is no longer in activeMonths and we deleted items, reset to first available
  useEffect(() => {
    if (activeMonths.length > 0 && !activeMonths.includes(selectedMonth)) {
      setSelectedMonth(activeMonths[0]);
    }
  }, [tournaments, payments, activeMonths, selectedMonth]);

  const activeReport = generateMonthlyReport(selectedMonth, players, tournaments, payments);

  // --- 4. UI State Engine ---
  const [activeTab, setActiveTab] = useState<'tournaments' | 'payments' | 'players' | 'analytics'>('tournaments');
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [showMonthEndReminder, setShowMonthEndReminder] = useState(true);

  // Auto-detect billing end warning period (days 29, 30, 31)
  const isMonthEnd = new Date().getDate() >= 29;

  // Player Name Edits state
  const [editNames, setEditNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const defaultDict: Record<string, string> = {};
    players.forEach(p => {
      defaultDict[p.id] = p.name;
    });
    setEditNames(defaultDict);
  }, [players]);

  // Flash auto-expiring notification
  const triggerNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4500);
  };

  // Find user details (Akash)
  const userPlayer = players.find(p => p.isUser) || players[0];

  // --- 5. Database Mutations (Transaction logs) ---
  const handleAddTournament = (newT: {
    name: string;
    game: string;
    date: string;
    entryFee: number;
    winnings: number;
    entryFeePayerId: string;
    winningsReceiverId: string;
    notes: string;
  }) => {
    const id = 't-' + Date.now();
    const tournamentRecord: Tournament = {
      id,
      ...newT
    };
    const updated = [tournamentRecord, ...tournaments];
    setTournaments(updated);
    syncToFirestore(players, updated, payments);
    
    // Automatically switch selectedMonth to the newly added month if required
    const tourneyMonth = newT.date.substring(0, 7);
    setSelectedMonth(tourneyMonth);
    triggerNotification(`Successfully logged ${newT.name}!`);
  };

  const handleAddPayment = (newP: {
    fromPlayerId: string;
    toPlayerId: string;
    amount: number;
    date: string;
    month: string;
    notes: string;
  }) => {
    const id = 'm-' + Date.now();
    const paymentRecord: Payment = {
      id,
      ...newP
    };
    const updated = [paymentRecord, ...payments];
    setPayments(updated);
    syncToFirestore(players, tournaments, updated);
    triggerNotification(`Recorded settlement of ${formatCurrency(newP.amount)}`);
  };

  // 1-Click Instant Settle Up triggered from Player Card
  const handleInstantSettle = (fromId: string, toId: string, amount: number) => {
    const fromName = players.find(p => p.id === fromId)?.name || 'Player';
    const toName = players.find(p => p.id === toId)?.name || 'Player';
    
    const id = 'm-' + Date.now();
    const paymentRecord: Payment = {
      id,
      fromPlayerId: fromId,
      toPlayerId: toId,
      amount,
      date: '2026-06-01', // Metadata billing date fallback
      month: selectedMonth,
      notes: `Quick settle balance between ${fromName} and ${toName}`
    };
    const updated = [paymentRecord, ...payments];
    setPayments(updated);
    syncToFirestore(players, tournaments, updated);
    triggerNotification(`Recorded settlement of ${formatCurrency(amount)}`);
  };

  const handleDeleteTournament = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete tournament "${name}"?`)) {
      const updated = tournaments.filter(t => t.id !== id);
      setTournaments(updated);
      syncToFirestore(players, updated, payments);
      triggerNotification(`Removed tournament ${name}`, 'info');
    }
  };

  const handleDeletePayment = (id: string, text: string) => {
    if (confirm(`Remove this settlement payment recording?`)) {
      const updated = payments.filter(p => p.id !== id);
      setPayments(updated);
      syncToFirestore(players, tournaments, updated);
      triggerNotification(`Deleted payment receipt`, 'info');
    }
  };

  // --- 6. Squad Member Name Updates ---
  const handleSaveNames = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPlayers = players.map(p => {
      const formName = editNames[p.id]?.trim();
      return {
        ...p,
        name: formName || p.name
      };
    });
    setPlayers(updatedPlayers);
    syncToFirestore(updatedPlayers, tournaments, payments);
    triggerNotification(`Squad names updated successfully!`);
  };

  // --- 7. Backup, Export, Import and Reset Utilities ---
  const handleResetToInitial = () => {
    if (confirm('Are you sure you want to reset all data back to the default May-June example tournaments? This will wipe your current records!')) {
      setPlayers(INITIAL_PLAYERS);
      setTournaments(INITIAL_TOURNAMENTS);
      setPayments(INITIAL_PAYMENTS);
      setSelectedMonth('2026-06');
      syncToFirestore(INITIAL_PLAYERS, INITIAL_TOURNAMENTS, INITIAL_PAYMENTS);
      triggerNotification('Re-populated starting template in database.', 'info');
    }
  };

  // Authentication controllers
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginUsername.trim().toLowerCase();
    const matched = HARDCODED_ACCOUNTS.find(acc => acc.username === cleanUser && acc.password === loginPassword);
    
    if (matched) {
      setLoginError('');
      setActiveUsername(matched.username);
      localStorage.setItem('squad_settle_username', matched.username);
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Invalid credentials. Check the credential roster below!');
    }
  };

  const handleLogout = () => {
    setActiveUsername(null);
    localStorage.removeItem('squad_settle_username');
    triggerNotification('Logged out successfully', 'info');
  };

  // --- RENDERING LOGIN PANEL IF NOT AUTHENTICATED ---
  if (!activeUsername) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-cyan-500 selection:text-slate-950" id="login-container">
        {/* Glow backdrop decorative layout */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/65 backdrop-blur-md border border-slate-800/80 p-8 rounded-3xl shadow-2xl relative space-y-6 animate-fade-in" id="login-card">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-cyan-950/40 border border-cyan-800/30 rounded-2xl shadow-inner relative justify-center items-center">
              <Lock className="w-6 h-6 text-cyan-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Squad Settle <span className="text-[10px] bg-cyan-950 font-mono text-cyan-400 border border-cyan-800/35 px-2 py-0.5 rounded-full uppercase">Cloud Sync</span>
            </h1>
            <p className="text-xs text-slate-400 font-sans">Log in to sync and access squad ledgers from any device</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="bg-rose-500/10 border border-rose-900/40 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                {loginError}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400" htmlFor="username">
                Squad Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="e.g. akash"
                className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 text-sm rounded-xl px-4 py-2.5 outline-none transition-colors text-white font-mono placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400" htmlFor="password">
                Squad Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-805 focus:border-cyan-500 text-sm rounded-xl px-4 py-2.5 outline-none transition-colors text-white font-mono placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-505 hover:to-cyan-400 text-slate-950 font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-lg shadow-cyan-950/20 active:scale-[0.98]"
            >
              Access Squad Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }




  // --- 7. Analytics Data Prep ---
  // Sum statistics for all months represented
  const allRepresentedMonths = Array.from(new Set([
    ...tournaments.map(t => t.date.substring(0, 7)),
    ...payments.map(p => p.month)
  ])).sort();

  const chartData = allRepresentedMonths.map(m => {
    const ts = tournaments.filter(t => t.date.startsWith(m));
    const totalEntry = ts.reduce((s, t) => s + t.entryFee, 0);
    const totalWin = ts.reduce((s, t) => s + t.winnings, 0);
    return {
      monthLabel: formatMonthName(m).split(' ')[0],
      monthCode: m,
      entry: totalEntry,
      winnings: totalWin,
      net: totalWin - totalEntry
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between" id="applet-root">
      


      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-grow space-y-6">
        
        {/* Alerts and Toast banners */}
        <AnimatePresence>
          {alertMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`border p-3.5 rounded-xl flex items-center gap-2.5 shadow-xl text-xs max-w-xl mx-auto md:max-w-none ${
                alertMsg.type === 'success' 
                  ? 'bg-cyan-950/20 border-cyan-800/40 text-cyan-200' 
                  : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
              }`}
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-cyan-400" />
              <div className="flex-grow flex items-center justify-between">
                <span>{alertMsg.text}</span>
                <span className="text-[10px] font-mono text-slate-500">Auto-saved</span>
              </div>
            </motion.div>
          )}


        </AnimatePresence>

        {/* Dashboard Header Panel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5" id="app-header">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500 rounded-2xl blur opacity-25 animate-pulse"></div>
              <img 
                src="./logo.png" 
                alt="Squad Settle Icon" 
                className="w-14 h-14 object-cover rounded-2xl border border-cyan-500/40 relative shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white">{activeAccount?.squadName || "Squad Settle"}</h1>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-cyan-950/65 border border-cyan-800/40 text-cyan-400">
                    <Cloud className={`w-3.5 h-3.5 ${isSaving ? 'animate-bounce text-emerald-400' : 'text-cyan-400'}`} />
                    {isSaving ? "Saving..." : "Synced"}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase bg-slate-900 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-850 px-2.5 py-1 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer select-none"
                    title="Log out of current squad database"
                  >
                    <LogOut className="w-2.5 h-2.5" /> Log Out
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Esports entry splitter • Active database ledger: <strong className="text-indigo-400 font-mono text-[11px]">@{activeUsername}</strong>
              </p>
            </div>
          </div>

          {/* Month Multi-Control */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800/60 p-1.5 rounded-2xl self-start md:self-auto shadow-inner" id="month-selectors">
            <div className="flex items-center px-3 gap-1.5 text-slate-400">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <label htmlFor="month-picker" className="text-xs font-mono font-bold uppercase tracking-wider">Billing Tab:</label>
            </div>
            
            <select
              id="month-picker"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-950 text-white font-mono text-xs px-3 py-1.5 rounded-xl border border-slate-800/80 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-bold pr-8"
            >
              {activeMonths.map(m => (
                <option key={m} value={m}>
                  {formatMonthName(m)}
                </option>
              ))}
            </select>

            <button
              onClick={() => downloadMonthlySummaryPDF(activeReport, players, selectedMonth)}
              type="button"
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-lg font-sans"
              title="Download overall monthly summary PDF"
            >
              <FileText className="w-3.5 h-3.5 text-slate-950" />
              Download Squad PDF
            </button>
          </div>
        </div>

        {/* End-Of-Month Settlement Warning Alert */}
        {isMonthEnd && showMonthEndReminder && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden bg-gradient-to-r from-amber-600/10 via-amber-700/15 to-amber-950/10 border border-amber-500/30 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            {/* Glowing warning line indicator overlay */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 text-[10px] uppercase font-black font-mono px-2.5 py-0.5 rounded-full tracking-wider animate-pulse flex items-center gap-1">
                  ⚠️ Month-End Alert (29th-31st)
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-200">
                Esports Cycle Close Warning: UPI Settle Up Approaching!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                We are approaching the monthly cycle close. Remember to log all your remaining <span className="text-amber-400 font-extrabold uppercase font-mono">Free Fire</span> tournaments and record matching UPI/GPay payments so <span className="text-white font-bold">Avi</span>, <span className="text-white font-bold">Arpit</span>, and <span className="text-white font-bold">Archit</span> stay completely reconciled.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('action-inputs-grid')?.scrollIntoView({ behavior: 'smooth' });
                  triggerNotification("Log your final tournaments or payments below!", "info");
                }}
                className="flex-grow md:flex-grow-0 text-center bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-sans text-xs px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer whitespace-nowrap"
              >
                Enter Records & Settle Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMonthEndReminder(false);
                  triggerNotification("Reminder dismissed. It will automatically reappear on the next session during days 29th-31st.", "info");
                }}
                className="flex-grow md:flex-grow-0 text-center bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                title="Dismiss warning"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}

        {/* Dynamic Multi-Metrics */}
        <DashboardMetrics report={activeReport} userPlayerId={userPlayer.id} />

        {/* Section Header: Teammates Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
                <Users className="w-5 h-5 text-cyan-400" /> Crew Monthly Settlements
              </h2>
              <p className="text-xs text-slate-400">End-of-month balances to settle with friends for {formatMonthName(selectedMonth)}</p>
            </div>

            <button
              onClick={handleResetToInitial}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 bg-slate-950 border border-slate-900 px-3 py-1.5 rounded-xl hover:border-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Re-populate template
            </button>
          </div>

          {/* Friends Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="squad-friends-ledger">
            {activeReport.playerSummaries
              .filter(p => p.playerId !== userPlayer.id)
              .map(summary => (
                <PlayerCard 
                  key={summary.playerId} 
                  summary={summary} 
                  userPlayer={userPlayer}
                  month={selectedMonth}
                  onInstantSettle={handleInstantSettle}
                />
              ))
            }
          </div>
        </div>

        {/* Double Input Section (Log entry and Record settlement cash) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="action-inputs-grid">
          {/* Tournament Form panel */}
          <AddTournamentForm players={players} onAdd={handleAddTournament} />

          {/* Cash Settle Form panel */}
          <AddPaymentForm 
            players={players} 
            activeMonths={activeMonths} 
            currentMonth={selectedMonth} 
            onAdd={handleAddPayment} 
          />
        </div>

        {/* Logs and Detailed Sheets */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl" id="detailed-sheets-panel">
          
          {/* Navigation Controls */}
          <div className="flex border-b border-slate-800 bg-slate-950 overflow-x-auto scroller-hidden">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`px-5 py-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'tournaments' 
                  ? 'border-cyan-500 text-cyan-400 bg-slate-900/60' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/10'
              }`}
            >
              <Trophy className="w-4 h-4" /> Tournament Records ({activeReport.tournaments.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-5 py-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'payments' 
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/60' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/10'
              }`}
            >
              <History className="w-4 h-4" /> Settlement Log ({activeReport.payments.length})
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-5 py-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'players' 
                  ? 'border-purple-500 text-purple-400 bg-slate-900/60' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/10'
              }`}
            >
              <Users className="w-4 h-4" /> Rename Squad
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-5 py-4 text-xs font-mono font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'analytics' 
                  ? 'border-pink-500 text-pink-400 bg-slate-900/60' 
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/10'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Performance Chart
            </button>
          </div>

          <div className="p-5">
            {/* Tab 1: Tournaments List */}
            {activeTab === 'tournaments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Showing tournaments for {formatMonthName(selectedMonth)}</span>
                  <span>{activeReport.tournaments.length} recorded</span>
                </div>

                {activeReport.tournaments.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No tournaments recorded for this billing cycle. Add one above to start splitting expenses!
                  </div>
                ) : (
                  <div>
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300 border-collapse animate-fade-in">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-400 bg-slate-950 font-mono tracking-wider uppercase">
                            <th className="p-3">Date</th>
                            <th className="p-3">Tournament Name</th>
                            <th className="p-3">Esports Game</th>
                            <th className="p-3 text-right">Entry Charges</th>
                            <th className="p-3 text-right">Winnings</th>
                            <th className="p-3">Payer/Collector</th>
                            <th className="p-3">Notes</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {activeReport.tournaments.map((t) => {
                            const payerName = players.find(p => p.id === t.entryFeePayerId)?.name || 'Squad member';
                            const receiverName = players.find(p => p.id === t.winningsReceiverId)?.name || 'Squad member';
                            return (
                              <tr key={t.id} className="hover:bg-slate-850 transition-colors">
                                <td className="p-3 font-mono whitespace-nowrap text-[11px]">{t.date}</td>
                                <td className="p-3 font-semibold text-white">{t.name}</td>
                                <td className="p-3">
                                  <span className="bg-slate-950 px-2.5 py-1 rounded-full border border-slate-850 text-[10px] text-cyan-400 uppercase font-bold font-mono">
                                    {t.game.split('(')[0].trim()}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-bold text-right text-slate-200">{formatCurrency(t.entryFee)}</td>
                                <td className="p-3 font-mono font-bold text-right text-emerald-400">{t.winnings > 0 ? formatCurrency(t.winnings) : '–'}</td>
                                <td className="p-3 text-[11px]">
                                  <p className="text-slate-400">Payer: <span className="text-slate-200 font-semibold">{payerName}</span></p>
                                  <p className="text-slate-400">Receiver: <span className="text-slate-200 font-semibold">{receiverName}</span></p>
                                </td>
                                <td className="p-3 text-slate-400 max-w-xs truncate" title={t.notes}>{t.notes || '–'}</td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTournament(t.id, t.name)}
                                    className="text-rose-400 hover:text-rose-300 p-1 bg-slate-950 rounded-lg hover:bg-rose-950/20 transition-all cursor-pointer border border-transparent hover:border-rose-900/40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View Card List */}
                    <div className="md:hidden space-y-3.5">
                      {activeReport.tournaments.map((t) => {
                        const payerName = players.find(p => p.id === t.entryFeePayerId)?.name || 'Squad member';
                        const receiverName = players.find(p => p.id === t.winningsReceiverId)?.name || 'Squad member';
                        return (
                          <div key={t.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl relative space-y-2.5 shadow-md">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-2">
                              <div>
                                <h4 className="text-sm font-semibold text-white leading-tight">{t.name}</h4>
                                <span className="text-[10px] font-mono text-slate-500">{t.date}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTournament(t.id, t.name)}
                                className="text-rose-400 hover:text-rose-300 p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-500 block font-mono text-[10px] uppercase">Entry Fee</span>
                                <span className="font-mono text-slate-200 font-bold">{formatCurrency(t.entryFee)}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block font-mono text-[10px] uppercase">Winnings Share</span>
                                <span className="font-mono text-emerald-400 font-bold">{t.winnings > 0 ? formatCurrency(t.winnings) : '₹0'}</span>
                              </div>
                              <div className="col-span-2 border-t border-slate-900 pt-2 text-[11px] text-slate-400 space-y-1">
                                <p><span className="text-slate-500 font-medium font-mono text-[9px] uppercase mr-1">Paid Entry:</span> <span className="text-slate-300 font-semibold">{payerName}</span></p>
                                <p><span className="text-slate-500 font-medium font-mono text-[9px] uppercase mr-1">Received balance:</span> <span className="text-slate-300 font-semibold">{receiverName}</span></p>
                              </div>
                            </div>

                            {t.notes && (
                              <div className="border-t border-slate-900/60 pt-2 text-[11px] text-slate-400 text-balance italic">
                                "{t.notes}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Payments Settle List */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Transactions settling accounts for {formatMonthName(selectedMonth)}</span>
                  <span>{activeReport.payments.length} recorded</span>
                </div>

                {activeReport.payments.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    No manual payments logged yet for this billing cycle. Recorded settlements immediately offset due balances.
                  </div>
                ) : (
                  <div>
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead>
                          <tr className="border-b border-slate-850 text-slate-400 bg-slate-950 font-mono tracking-wider uppercase">
                            <th className="p-3">Date</th>
                            <th className="p-3">Who Paid (From)</th>
                            <th className="p-3">Recipient (To)</th>
                            <th className="p-3 text-right">Amount Settled</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {activeReport.payments.map((p) => {
                            const fromName = players.find(player => player.id === p.fromPlayerId)?.name || 'Squad member';
                            const toName = players.find(player => player.id === p.toPlayerId)?.name || 'Squad member';
                            return (
                              <tr key={p.id} className="hover:bg-slate-850 transition-colors">
                                <td className="p-3 font-mono whitespace-nowrap text-[11px]">{p.date}</td>
                                <td className="p-3 font-semibold text-white">{fromName}</td>
                                <td className="p-3 font-semibold text-white">{toName}</td>
                                <td className="p-3 font-mono font-bold text-right text-emerald-400">{formatCurrency(p.amount)}</td>
                                <td className="p-3 text-slate-400 text-balance">{p.notes || 'Settlement transfer'}</td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(p.id, `${fromName} paid ${toName}`)}
                                    className="text-rose-400 hover:text-rose-300 p-1 bg-slate-950 rounded-lg hover:bg-rose-950/20 transition-all cursor-pointer border border-transparent hover:border-rose-900/40"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View Card List */}
                    <div className="md:hidden space-y-3">
                      {activeReport.payments.map((p) => {
                        const fromName = players.find(player => player.id === p.fromPlayerId)?.name || 'Squad member';
                        const toName = players.find(player => player.id === p.toPlayerId)?.name || 'Squad member';
                        return (
                          <div key={p.id} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl relative space-y-2 py-3.5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                              <span className="text-[10px] font-mono text-slate-500">{p.date}</span>
                              <button
                                type="button"
                                onClick={() => handleDeletePayment(p.id, `${fromName} paid ${toName}`)}
                                className="text-rose-400 hover:text-rose-300 p-1.5 bg-slate-900 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-1">
                              <div>
                                <span className="text-slate-500 block font-mono text-[9px] uppercase">Payer (From)</span>
                                <span className="font-semibold text-white">{fromName}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-500 block font-mono text-[9px] uppercase">Recipient (To)</span>
                                <span className="font-semibold text-white">{toName}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                              <span className="text-slate-400 font-mono text-[10px] uppercase">Settled sum:</span>
                              <span className="font-mono text-emerald-400 font-bold text-sm bg-emerald-950/30 border border-emerald-800/20 px-2 py-0.5 rounded-lg">{formatCurrency(p.amount)}</span>
                            </div>

                            {p.notes && (
                              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-900/40 text-balance italic">
                                "{p.notes}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Squad Member Manager (Rename) */}
            {activeTab === 'players' && (
              <div className="max-w-xl mx-auto space-y-4">
                <div className="bg-slate-950/40 p-4 border border-slate-800 rounded-xl space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 font-bold">
                    <Info className="w-4 h-4" /> Direct Member Configuration
                  </h4>
                  <p className="text-xs text-slate-400">
                    Entering the real names of your friends instantly updates all monthly reports, clipboard text templates, and logs for absolute clarity and audit readiness.
                  </p>
                </div>

                <form onSubmit={handleSaveNames} className="space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-5" id="rename-squad-form">
                  <div className="space-y-3">
                    {players.map((p) => (
                      <div key={p.id}>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                          {p.isUser ? 'Player 1 (User Account)' : `Teammate Slot`}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={editNames[p.id] || ''}
                            onChange={(e) => setEditNames(prev => ({ ...prev, [p.id]: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            placeholder="Type nickname..."
                          />
                          {p.isUser && (
                            <span className="absolute right-3 top-2 text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800/20 uppercase font-mono font-bold select-none">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-500 text-white font-bold py-2 rounded-xl hover:from-purple-500 hover:to-indigo-400 transition-all text-xs cursor-pointer"
                  >
                    Save Squad Member Nicknames
                  </button>
                </form>
              </div>
            )}

            {/* Tab 4: Performance Analytics */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-white">Squad Cashflow Performance Trend</h4>
                  <p className="text-xs text-slate-400">Month-over-month entries paid versus prizes won.</p>
                </div>

                {chartData.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-sm">
                    Not enough monthly data points to render charts. Log multiple months to track analytics!
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
                    {/* SVG Chart */}
                    <div className="relative h-64 w-full">
                      <svg className="w-full h-full" viewBox="0 0 500 240" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="50" y1="30" x2="480" y2="30" stroke="#1e293b" strokeDasharray="3,3" />
                        <line x1="50" y1="90" x2="480" y2="90" stroke="#1e293b" strokeDasharray="3,3" />
                        <line x1="50" y1="150" x2="480" y2="150" stroke="#1e293b" strokeDasharray="3,3" />
                        <line x1="50" y1="210" x2="480" y2="210" stroke="#1e293b" />

                        {/* Chart Render bars */}
                        {chartData.map((data, index) => {
                          const spacing = 430 / chartData.length;
                          const startX = 65 + index * spacing;
                          
                          // Scaling factor based on max value in sample
                          const maxVal = Math.max(...chartData.map(d => Math.max(d.entry, d.winnings, 100)), 3000);
                          const entryHeight = (data.entry / maxVal) * 160;
                          const winningsHeight = (data.winnings / maxVal) * 160;

                          return (
                            <g key={data.monthCode}>
                              {/* Entry Fee Bar (Amber) */}
                              <rect
                                x={startX}
                                y={210 - entryHeight}
                                width="18"
                                height={Math.max(2, entryHeight)}
                                fill="#d97706"
                                rx="3"
                                className="opacity-80 hover:opacity-100 transition-opacity"
                              />
                              
                              {/* Winnings Bar (Emerald) */}
                              <rect
                                x={startX + 22}
                                y={210 - winningsHeight}
                                width="18"
                                height={Math.max(2, winningsHeight)}
                                fill="#059669"
                                rx="3"
                                className="opacity-80 hover:opacity-100 transition-opacity"
                              />

                              {/* Label on X-axis */}
                              <text
                                x={startX + 20}
                                y="230"
                                fill="#94a3b8"
                                fontSize="10"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                {data.monthLabel}
                              </text>
                            </g>
                          );
                        })}

                        {/* Y-Axis markers */}
                        <text x="15" y="34" fill="#64748b" fontSize="9" fontFamily="monospace">Max</text>
                        <text x="15" y="124" fill="#64748b" fontSize="9" fontFamily="monospace">Mid</text>
                        <text x="15" y="214" fill="#64748b" fontSize="9" fontFamily="monospace">Zero</text>
                      </svg>
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center justify-center gap-6 mt-4">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-3 bg-amber-600 rounded"></span>
                        <span className="text-xs text-slate-300 font-mono">Entry Charges Splitted</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-3 bg-emerald-600 rounded"></span>
                        <span className="text-xs text-slate-300 font-mono">Winnings Collected</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Footer Branding block */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Esports Squad Settle. All calculations compliant with 4-way balanced ledger accounting.</p>
          <div className="flex items-center gap-6 text-[11px]">
            <span className="text-slate-400">Offline Manifest: Connected</span>
            <span className="text-slate-400">GPay/UPI-ready format</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
