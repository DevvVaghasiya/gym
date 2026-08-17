import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { TrendingUp, Plus, Activity, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { useProgressStore } from '../store/useProgressStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { analyzeProgress } from '../engine/adaptiveEngine';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function ProgressPage() {
  const profile = useUserStore(s => s.profile);
  const { entries, addEntry, prs } = useProgressStore();
  const dietPlan = useNutritionStore(s => s.currentPlan);
  const [weight, setWeight] = useState(profile?.weightKg?.toString() || '');
  const [bf, setBf] = useState(profile?.bodyFatPercent?.toString() || '');
  const [mm, setMm] = useState(profile?.muscleMassPercent?.toString() || '');
  const [note, setNote] = useState('');

  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date.localeCompare(b.date)),
    [entries]
  );

  const advice = profile
    ? analyzeProgress(profile, sorted, dietPlan?.dailyCalories || Math.round(profile.tdee))
    : null;

  const chartData = {
    labels: sorted.map(e => e.date.slice(5)),
    datasets: [
      {
        label: 'Weight (kg)',
        data: sorted.map(e => e.weightKg),
        borderColor: 'rgba(59,130,246,1)',
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const save = () => {
    const w = Number(weight);
    if (!w) return;
    addEntry({
      date: new Date().toISOString().slice(0, 10),
      weightKg: w,
      bodyFatPercent: bf ? Number(bf) : undefined,
      muscleMassPercent: mm ? Number(mm) : undefined,
      notes: note || undefined,
    });
    setNote('');
  };

  if (!profile) {
    return <div className="text-gray-400 p-8">Complete onboarding to track progress.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto pb-20 space-y-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-3">Progress Tracking</h1>
          <p className="text-gray-500 font-medium text-sm">Visualize your body composition evolution and strength gains.</p>
        </div>
      </header>

      {advice && (
        <div className="stat-card !bg-blue-600/10 !border-blue-500/20 shadow-2xl shadow-blue-900/10 overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-500/20 transition-colors" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-blue-500 text-[10px] font-black uppercase tracking-[0.2em]">AI Performance Analysis</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight mb-3">{advice.title}</h2>
              <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-3xl">{advice.detail}</p>
            </div>

            {advice.calorieDelta !== 0 && (
              <div className="flex-shrink-0 bg-white/[0.03] border border-white/5 rounded-3xl p-6 backdrop-blur-md">
                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-2">Recommended Adjustment</p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-black text-white">{advice.nextCalories}</span>
                  <span className="text-gray-500 text-xs font-bold uppercase">kcal / day</span>
                </div>
                <div className={`text-[10px] font-extrabold uppercase flex items-center gap-1.5 ${advice.calorieDelta > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  <TrendingUp className={`w-3 h-3 ${advice.calorieDelta < 0 ? "rotate-180" : ""}`} />
                  {advice.calorieDelta > 0 ? '+' : ''}{advice.calorieDelta} kcal Change
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Chart */}
        <div className="lg:col-span-8 stat-card !bg-white/[0.02] border-white/5 shadow-2xl h-full flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between mb-10">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                 <TrendingUp className="w-5 h-5" />
               </div>
               <h3 className="text-lg font-bold text-white tracking-tight">Weight Transformation</h3>
             </div>
             <div className="flex gap-2">
               <button className="px-3 py-1.5 rounded-lg bg-white/5 text-[9px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">1 Month</button>
               <button className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-[9px] font-black text-indigo-400 uppercase tracking-widest border border-indigo-500/20">All Time</button>
             </div>
          </div>
          
          <div className="flex-1 w-full relative">
            {sorted.length >= 2 ? (
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, titleFont: { size: 14, family: 'Inter' }, bodyFont: { size: 13, family: 'Inter' }, cornerRadius: 8, displayColors: false, callbacks: { label: (ctx: any) => `${ctx.parsed.y} kg` } } },
                  scales: {
                    x: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { display: false }, border: { display: false } },
                    y: { ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }, grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false } },
                  },
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-black/20 rounded-[2rem] border border-dashed border-white/5">
                <TrendingUp className="w-12 h-12 text-gray-800 mb-4" />
                <p className="text-gray-600 font-bold text-sm">Insufficient Data Points</p>
                <p className="text-gray-700 text-xs mt-1">Complete 2 or more check-ins to visualize your progress trend.</p>
              </div>
            )}
          </div>
        </div>

        {/* Check-in Form */}
        <div className="lg:col-span-4 stat-card !bg-white/[0.03] border-white/10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-xl font-extrabold text-white tracking-tight mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
              <Plus className="w-6 h-6" />
            </div>
            New Check-in
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Weight (kg)</label>
              <input value={weight} onChange={e => setWeight(e.target.value)} type="number" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/40 transition-all outline-none" placeholder="00.0" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Body Fat %</label>
                <input value={bf} onChange={e => setBf(e.target.value)} type="number" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/40 transition-all outline-none" placeholder="00" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Muscle %</label>
                <input value={mm} onChange={e => setMm(e.target.value)} type="number" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/40 transition-all outline-none" placeholder="00" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Progress Note</label>
              <input value={note} onChange={e => setNote(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/40 transition-all outline-none" placeholder="How was your week?" />
            </div>

            <button onClick={save} className="w-full py-5 rounded-[1.5rem] bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.25em] shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all mt-4">
              Commit Check-in
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* History */}
        <div className="stat-card !p-0 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">Timeline History</h3>
            </div>
          </div>
          
          <div className="p-4 sm:p-8 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {sorted.length === 0 ? (
              <p className="text-center py-10 text-gray-600 font-bold text-sm">No entries logged yet.</p>
            ) : (
              [...sorted].reverse().map((e, idx) => (
                <div key={idx} className="flex justify-between items-center p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-black/20 px-3 py-1 rounded-lg">{e.date}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-black text-base">{e.weightKg} <span className="text-gray-600 text-[10px] uppercase">kg</span></span>
                    {e.bodyFatPercent && <span className="text-cyan-500 text-xs font-black ml-3 tracking-tighter">{e.bodyFatPercent}% BF</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PRs */}
        <div className="stat-card !p-0 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                <Trophy className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">Strength Records</h3>
            </div>
          </div>
          
          <div className="p-4 sm:p-8 space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {prs.length === 0 ? (
              <p className="text-center py-10 text-gray-600 font-bold text-sm">Complete workouts to log records.</p>
            ) : (
              prs.slice(-10).reverse().map((pr, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center p-5 rounded-[1.5rem] bg-white/[0.02] border border-white/5 hover:border-rose-500/30 transition-all gap-4">
                  <div>
                    <h4 className="text-white font-bold text-sm mb-1">{pr.exerciseName}</h4>
                    <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest">{pr.date}</p>
                  </div>
                  <div className="flex items-center gap-5 justify-between sm:justify-end">
                    <div className="text-right">
                      <p className="text-white font-black text-base">{pr.weight}kg <span className="text-gray-600 text-xs">× {pr.reps}</span></p>
                      <p className="text-rose-500/80 text-[10px] font-black uppercase tracking-tighter mt-0.5">e1RM: {pr.estimated1RM}kg</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
