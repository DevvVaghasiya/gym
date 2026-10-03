import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { TrendingUp, Plus, Activity, Trophy, Trash2, CheckCircle, Calendar, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { useProgressStore } from '../store/useProgressStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useAuthStore } from '../store/useAuthStore';
import { analyzeProgress } from '../engine/adaptiveEngine';
import { fetchProgressEntries, saveProgressEntry } from '../lib/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// Format raw ISO strings like '2026-09-27T18:30:00.000Z' into clean 'YYYY-MM-DD'
const formatDateStr = (rawDateStr: string) => {
  if (!rawDateStr) return new Date().toISOString().slice(0, 10);
  if (rawDateStr.includes('T')) return rawDateStr.split('T')[0];
  return rawDateStr.slice(0, 10);
};

export default function ProgressPage() {
  const profile = useUserStore(s => s.profile);
  const token = useAuthStore(s => s.token);
  const { entries, addEntry, removeEntry, setEntries, prs, addPR, removePR } = useProgressStore();
  const dietPlan = useNutritionStore(s => s.currentPlan);

  const [weight, setWeight] = useState(profile?.weightKg?.toString() || '');
  const [bf, setBf] = useState(profile?.bodyFatPercent?.toString() || '');
  const [mm, setMm] = useState(profile?.muscleMassPercent?.toString() || '');
  const [note, setNote] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // PR Editing State
  const [editingPRId, setEditingPRId] = useState<string | null>(null);
  const [editPRWeight, setEditPRWeight] = useState<string>('');
  const [editPRReps, setEditPRReps] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      try {
        const apiEntries = await fetchProgressEntries(token);
        if (isMounted && apiEntries.length > 0) {
          const userEmail = profile?.email;
          const mapped = apiEntries.map((entry) => ({
            id: (entry as any).id || `entry_${entry.date}_${Math.random().toString(36).substring(2, 7)}`,
            userEmail: (entry as any).userEmail || userEmail,
            date: formatDateStr(entry.date),
            weightKg: Number(entry.weightKg),
            bodyFatPercent: entry.bodyFatPercent == null ? undefined : Number(entry.bodyFatPercent),
            muscleMassPercent: entry.muscleMassPercent == null ? undefined : Number(entry.muscleMassPercent),
            notes: entry.notes || undefined,
          }));
          setEntries(mapped);
        }
      } catch {
        if (isMounted && entries.length > 0) {
          setEntries(entries);
        }
      }
    };

    loadHistory();
    return () => { isMounted = false; };
  }, [token, setEntries, profile]);

  // User Isolation: Only show entries for the current logged-in user
  const userEntries = useMemo(() => {
    if (!profile?.email) return entries;
    return entries.filter(e => !e.userEmail || e.userEmail === profile.email);
  }, [entries, profile]);

  const userPRs = useMemo(() => {
    if (!profile?.email) return prs;
    return prs.filter(p => !p.userEmail || p.userEmail === profile.email);
  }, [prs, profile]);

  const sorted = useMemo(
    () => [...userEntries].sort((a, b) => formatDateStr(a.date).localeCompare(formatDateStr(b.date))),
    [userEntries]
  );

  const chartData = {
    labels: sorted.map(e => formatDateStr(e.date)),
    datasets: [
      {
        label: 'Weight (kg)',
        data: sorted.map(e => e.weightKg),
        borderColor: 'rgba(59,130,246,1)',
        backgroundColor: 'rgba(59,130,246,0.15)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const handleSaveCheckIn = async () => {
    const w = Number(weight);
    if (!w) return;

    const todayCleanDate = new Date().toISOString().slice(0, 10);
    const entry = {
      id: `entry_${Date.now()}`,
      userEmail: profile?.email || 'default_user',
      date: todayCleanDate,
      weightKg: w,
      bodyFatPercent: bf ? Number(bf) : undefined,
      muscleMassPercent: mm ? Number(mm) : undefined,
      notes: note || undefined,
    };

    addEntry(entry);
    showToast('Check-in logged successfully!');

    try {
      await saveProgressEntry(entry, token);
    } catch {
      // Offline fallback available
    }

    setNote('');
  };

  const handleDeleteEntry = (entry: any) => {
    if (!confirm(`Delete progress entry for ${formatDateStr(entry.date)} (${entry.weightKg} kg)?`)) return;
    removeEntry(entry.id || entry.date, profile?.email);
    showToast('Progress entry deleted.');
  };

  const handleEditPRClick = (pr: any) => {
    setEditingPRId(pr.id);
    setEditPRWeight(pr.weight.toString());
    setEditPRReps(pr.reps.toString());
  };

  const handleSavePREdit = (pr: any) => {
    const newWeight = Number(editPRWeight);
    const newReps = Number(editPRReps);
    if (!newWeight || !newReps) return;

    // Calculate new estimated 1RM
    const newE1RM = Math.round(newWeight * (1 + newReps / 30));

    // Remove old and add new to effectively update
    removePR(pr.id);
    addPR({
      ...pr,
      weight: newWeight,
      reps: newReps,
      estimated1RM: newE1RM,
    });
    
    setEditingPRId(null);
    showToast('Strength record updated!');
  };

  const handleDeletePR = (pr: any) => {
    if (!confirm(`Delete strength record for ${pr.exerciseName}?`)) return;
    removePR(pr.id);
    showToast('Strength record deleted.');
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  if (!profile) {
    return <div className="text-gray-400 p-8 text-center font-bold">Complete onboarding to track your progress.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto pb-24 pt-8 flex flex-col gap-10 font-sans"
    >
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 border border-blue-500/40 text-blue-300 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur-xl"
          >
            <CheckCircle className="w-4 h-4 text-blue-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-white/10 p-6 sm:p-8 rounded-[2rem] backdrop-blur-xl">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-300">
            <Activity className="w-3.5 h-3.5" />
            Isolated User Metrics: {profile.name}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Progress Tracking</h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">Visualize your body weight transformation and personal strength records.</p>
        </div>
      </header>



      {/* Main Grid: Chart & Check-in */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Weight Transformation Chart */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl flex flex-col min-h-[440px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Weight Transformation</h3>
                <p className="text-xs text-slate-400 font-medium">Logged check-ins for {profile.name}</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full relative min-h-[300px]">
            {sorted.length >= 2 ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#0f172a',
                      padding: 12,
                      titleFont: { size: 12, weight: 'bold' },
                      bodyFont: { size: 12 },
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderWidth: 1,
                      displayColors: false,
                      callbacks: { label: (ctx: any) => `${ctx.parsed.y} kg` }
                    }
                  },
                  scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: '#94a3b8', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                  },
                }}
              />
            ) : (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center text-center p-8 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800">
                <TrendingUp className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-slate-400 font-bold text-sm">Need at least 2 check-ins</p>
                <p className="text-slate-500 text-xs mt-1">Log your weight check-ins to view your progress trend graph.</p>
              </div>
            )}
          </div>
        </div>

        {/* New Check-in Form */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">New Check-in</h3>
              <p className="text-xs text-slate-400 font-medium">Log your weight for today</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Current Weight (kg)</label>
              <input
                value={weight} onChange={e => setWeight(e.target.value)}
                type="number" step="0.1" placeholder="70.5"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Body Fat %</label>
                <input
                  value={bf} onChange={e => setBf(e.target.value)}
                  type="number" step="0.1" placeholder="15.0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Muscle %</label>
                <input
                  value={mm} onChange={e => setMm(e.target.value)}
                  type="number" step="0.1" placeholder="40.0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 ml-1">Progress Notes</label>
              <input
                value={note} onChange={e => setNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold text-white outline-none focus:border-blue-500"
                placeholder="Feeling energetic this week..."
              />
            </div>

            <button
              onClick={handleSaveCheckIn}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-2"
            >
              Commit Check-in
            </button>
          </div>
        </div>
      </div>

      {/* Timeline History & Personal Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Timeline History List */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Timeline History</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{sorted.length} entries recorded</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {sorted.length === 0 ? (
              <p className="text-center py-10 text-slate-500 font-bold text-sm">No progress check-ins recorded yet.</p>
            ) : (
              [...sorted].reverse().map((e, idx) => (
                <div key={e.id || idx} className="group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] transition-all duration-300">
                  <div>
                    <span className="text-sm font-bold text-slate-200 block group-hover:text-white transition-colors">{formatDateStr(e.date)}</span>
                    {e.notes && <p className="text-xs text-slate-500 mt-1 font-medium">{e.notes}</p>}
                  </div>
                  
                  <div className="flex items-center gap-5">
                    <div className="text-right">
                      <span className="text-white font-black text-lg">{e.weightKg} <span className="text-slate-500 text-xs font-bold">kg</span></span>
                      {e.bodyFatPercent && <span className="block text-cyan-400 text-[10px] font-black uppercase tracking-wider mt-0.5">{e.bodyFatPercent}% BF</span>}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(e)}
                      title="Delete progress entry"
                      className="w-8 h-8 flex flex-shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Personal Records List */}
        <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl flex flex-col">
          <div className="flex items-center justify-between pb-5 border-b border-white/5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Strength Records</h3>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Logged PRs</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {userPRs.length === 0 ? (
              <p className="text-center py-10 text-slate-500 font-bold text-sm">Complete workout sets to record personal strength PRs.</p>
            ) : (
              userPRs.slice(-10).reverse().map((pr, idx) => (
                <div key={pr.id || idx} className="group flex flex-col p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all duration-300">
                  {editingPRId === pr.id ? (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-bold text-base">{pr.exerciseName}</h4>
                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{formatDateStr(pr.date)}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="number" 
                          value={editPRWeight} 
                          onChange={(e) => setEditPRWeight(e.target.value)} 
                          className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-500 transition-colors" 
                          placeholder="kg"
                        />
                        <span className="text-slate-500 text-xs font-black uppercase tracking-wider">kg ×</span>
                        <input 
                          type="number" 
                          value={editPRReps} 
                          onChange={(e) => setEditPRReps(e.target.value)} 
                          className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-500 transition-colors" 
                          placeholder="reps"
                        />
                        <button onClick={() => handleSavePREdit(pr)} className="ml-auto px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg rounded-xl text-xs font-black uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all">Save</button>
                        <button onClick={() => setEditingPRId(null)} className="px-4 py-2 bg-white/5 text-slate-300 rounded-xl text-xs font-bold hover:bg-white/10 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-bold text-base group-hover:text-amber-100 transition-colors">{pr.exerciseName}</h4>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">{formatDateStr(pr.date)}</p>
                      </div>
                      
                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <span className="text-white font-black text-lg">{pr.weight} kg <span className="text-slate-400 text-xs font-semibold">× {pr.reps} reps</span></span>
                          <span className="block text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md mt-1 border border-amber-500/20 w-fit ml-auto shadow-[0_0_10px_rgba(245,158,11,0.1)]">e1RM: {pr.estimated1RM} kg</span>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <button onClick={() => handleEditPRClick(pr)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/20 transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeletePR(pr)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
