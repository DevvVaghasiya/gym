import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useProgressStore } from '../store/useProgressStore';
import { calculateAllMetrics } from '../engine/bodyComposition';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, Droplet, Target, Zap, Dumbbell, Award, 
  ChevronRight, TrendingUp, Sparkles, AlertCircle, MapPin,
  Activity, Utensils, Trophy, Plus, X
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, 
  LineElement, Title, Tooltip, Legend, Filler 
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  Title, Tooltip, Legend, Filler
);

export default function DashboardPage() {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const { currentPlan } = useWorkoutStore();
  const { entries } = useProgressStore();
  const navigate = useNavigate();

  const [waterLogged, setWaterLogged] = useState(1.5);
  const [showBanner, setShowBanner] = useState(true);

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <AlertCircle className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Onboarding Required</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-6">Complete your physical diagnostic to generate your training and diet plans.</p>
        <button onClick={() => navigate('/onboarding')} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-all">Begin Diagnostic</button>
      </div>
    );
  }

  const metrics = calculateAllMetrics(profile);
  const waterTarget = metrics.waterIntakeLiters || 3.0;
  const xp = profile.xp || 120;
  const level = profile.level || 1;
  const streak = profile.streak || 3;
  const xpMax = level * 500;
  const xpPercent = Math.min(100, Math.round((xp / xpMax) * 100));

  const logWater = (amt: number) => {
    const next = Math.min(6, Math.round((waterLogged + amt) * 100) / 100);
    setWaterLogged(next);
    updateProfile({ xp: xp + 10 });
  };

  const sortedProgress = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const chartData = {
    labels: sortedProgress.length >= 2 ? sortedProgress.map(e => e.date.slice(5)) : ['Baseline'],
    datasets: [{
      fill: true,
      label: 'Weight (kg)',
      data: sortedProgress.length >= 2 ? sortedProgress.map(e => e.weightKg) : [profile.weightKg],
      borderColor: 'rgba(99,102,241,1)',
      backgroundColor: 'rgba(99,102,241,0.07)',
      tension: 0.45,
      pointBackgroundColor: 'rgba(99,102,241,1)',
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 } },
        border: { display: false }
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255,255,255,0.35)', font: { size: 11 } },
        border: { display: false }
      }
    }
  };

  const recoveryScore = profile.sleepHours >= 8 ? 88 : profile.sleepHours >= 7 ? 74 : 52;
  const waterPct = Math.min(100, Math.round((waterLogged / waterTarget) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 pb-16"
    >
      {/* Plan Ready Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex items-center justify-between gap-6 shadow-2xl shadow-blue-900/20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-white font-extrabold text-lg tracking-tight">AI Training Plan Ready</h4>
                <p className="text-blue-100 text-sm font-medium opacity-90">We've generated a personalized {(profile.recommendedStrategy || profile.goal).replace('_', ' ')} strategy for you.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 relative z-10">
              <button className="px-6 py-2.5 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-lg">View Plan</button>
              <button onClick={() => setShowBanner(false)} className="p-2.5 text-white/60 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/5 p-8 flex flex-col md:flex-row items-center gap-8 backdrop-blur-3xl group hover:bg-white/[0.05] transition-all duration-500">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-500/15 transition-colors" />

          <div className="relative">
            <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-blue-500 to-purple-600 p-[3px] shadow-2xl shadow-blue-500/20">
              <div className="w-full h-full rounded-[2.3rem] bg-slate-900 flex items-center justify-center overflow-hidden">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-white">{profile.name.charAt(0)}</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-emerald-500 border-4 border-slate-900 flex items-center justify-center shadow-lg">
              <Trophy className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left relative z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-extrabold uppercase tracking-widest mb-3 ring-1 ring-blue-500/20">
              {profile.goal.replace('_', ' ')} Specialist
            </span>
            <h1 className="text-4xl font-extrabold text-white tracking-tighter mb-2">Hey, {profile.name}!</h1>
            <p className="text-gray-400 font-medium mb-6">You're on a <span className="text-orange-500 font-bold">{streak} day streak</span>. Keep pushing!</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <div className="px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/5 text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" />
                Level {level}
              </div>
              <div className="px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/5 text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                {xp} XP
              </div>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="stat-card flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Next Level</h3>
            <span className="text-blue-500 font-black text-sm">{xpPercent}%</span>
          </div>
          <div className="relative h-4 w-full bg-white/[0.05] rounded-full overflow-hidden mb-4 ring-1 ring-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]"
            />
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest text-center">
            Earn {xpMax - xp} XP to reach Level {level + 1}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Flame, label: 'Calories', val: metrics.dailyCalories.toFixed(0), unit: 'kcal', color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { icon: Target, label: 'Protein', val: metrics.macros.protein.toFixed(0), unit: 'g', color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { icon: Droplet, label: 'Water', val: waterLogged.toFixed(1), unit: 'L', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
          { icon: Zap, label: 'Recovery', val: recoveryScore, unit: '%', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map((s, i) => (
          <div key={i} className="stat-card group">
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-1">{s.label}</p>
            <div className="flex items-baseline gap-1">
              <h4 className="text-3xl font-black text-white tracking-tight">{s.val}</h4>
              <span className="text-gray-500 text-sm font-bold">{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workout Plan */}
        <div className="lg:col-span-2 stat-card !p-0">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Dumbbell className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white">Daily Routine</h3>
                <p className="text-gray-500 text-sm font-medium">Your customized workout for today</p>
              </div>
            </div>
            <button onClick={() => navigate('/workout')} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20">
              Start Session
            </button>
          </div>
          <div className="p-8 space-y-4">
            {currentPlan?.days[0]?.exercises?.slice(0, 3).map((ex, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center font-bold text-blue-500 text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-sm">{ex.exercise.name}</h4>
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{ex.sets} sets · {ex.reps} reps</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition */}
        <div className="stat-card">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Meal Plan</h3>
          </div>
          <div className="space-y-6">
            {[
              { label: 'Breakfast', name: 'High Protein Oats', cal: '450 kcal', status: 'Done' },
              { label: 'Lunch', name: 'Chicken & Quinoa', cal: '650 kcal', status: 'Pending' },
              { label: 'Dinner', name: 'Salmon & Greens', cal: '550 kcal', status: 'Pending' },
            ].map((meal, i) => (
              <div key={i} className="relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-white/5 hover:before:bg-yellow-500/50 before:transition-colors">
                <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-1">{meal.label}</p>
                <h4 className="text-white font-bold text-sm mb-1">{meal.name}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-[10px] font-bold">{meal.cal}</span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-tighter ${meal.status === 'Done' ? 'text-emerald-500' : 'text-gray-600'}`}>{meal.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/nutrition')} className="w-full mt-8 py-3.5 bg-white/[0.03] border border-white/10 rounded-[1.2rem] text-gray-400 font-bold text-xs uppercase tracking-[0.2em] hover:bg-white/[0.05] hover:text-white transition-all">
            Manage Nutrition
          </button>
        </div>
      </div>
    </motion.div>
  );
}
