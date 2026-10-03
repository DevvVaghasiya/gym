import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useProgressStore } from '../store/useProgressStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { calculateAllMetrics } from '../engine/bodyComposition';
import { fetchDailyStats, saveDailyStats } from '../lib/api';
import { motion } from 'framer-motion';
import {
  Flame, Droplet, Target, Zap, Dumbbell,
  TrendingUp, AlertCircle,
  Utensils, Check, Plus, ArrowRight, ChevronRight,
  Sparkles, Brain, Activity, BarChart3, MessageCircle, Play
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

const formatDateLabel = (rawDate: string) => {
  if (!rawDate) return '';
  if (rawDate.includes('T')) return rawDate.split('T')[0];
  return rawDate;
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: 'easeOut' as const } }),
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const token = useAuthStore(state => state.token);
  const dietPlan = useNutritionStore(state => state.currentPlan);
  const { currentPlan } = useWorkoutStore();
  const { entries } = useProgressStore();
  const navigate = useNavigate();

  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [waterLogged, setWaterLogged] = useState<number>(() => {
    const saved = localStorage.getItem(`fitai_water_${todayDate}`);
    return saved !== null ? parseFloat(saved) || 0 : 0;
  });
  const [mealState, setMealState] = useState<Record<string, boolean>>({});

  const persistDashboardState = async (nextWater: number, nextMealState: Record<string, boolean>) => {
    if (!profile) return;
    localStorage.setItem(`fitai_water_${todayDate}`, nextWater.toString());
    const meals = (dietPlan?.meals ?? []).map(meal => ({
      id: meal.id,
      time: meal.time,
      name: meal.name,
      logged: !!(nextMealState[meal.id] ?? meal.logged),
      skipped: false,
    }));
    try {
      await saveDailyStats({ date: todayDate, waterIntakeLiters: Number(nextWater.toFixed(2)), meals }, token);
    } catch (error) {
      console.warn('Failed to save daily dashboard state:', error);
    }
  };

  useEffect(() => {
    if (!profile) return;
    const savedLocal = localStorage.getItem(`fitai_water_${todayDate}`);
    if (savedLocal !== null) setWaterLogged(parseFloat(savedLocal) || 0);

    const loadDailyStats = async () => {
      try {
        const stats = await fetchDailyStats(token, todayDate);
        if (stats && typeof stats.waterIntakeLiters === 'number' && stats.waterIntakeLiters > 0) {
          setWaterLogged(Number(stats.waterIntakeLiters));
          localStorage.setItem(`fitai_water_${todayDate}`, stats.waterIntakeLiters.toString());
        }
        if (Array.isArray(stats?.meals) && stats.meals.length > 0) {
          setMealState(Object.fromEntries(stats.meals.filter(m => m?.id).map(m => [m.id, !!m.logged])));
        } else if (dietPlan?.meals) {
          setMealState(Object.fromEntries(dietPlan.meals.map(m => [m.id, !!m.logged])));
        }
      } catch {
        if (dietPlan?.meals) setMealState(Object.fromEntries(dietPlan.meals.map(m => [m.id, !!m.logged])));
      }
    };
    loadDailyStats();
  }, [profile, token, todayDate, dietPlan]);

  /* ── SETUP REQUIRED ─────────────────────────────────────── */
  if (!profile) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-12 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mb-8">
            <Sparkles className="w-12 h-12 text-cyan-400" />
          </div>
        </div>
        <h3 className="text-3xl font-black text-white mb-4 tracking-tight">Setup Your Profile</h3>
        <p className="text-slate-400 max-w-sm mb-10 leading-relaxed text-sm">
          Complete your physical diagnostic so our AI engine can generate a personalized training and nutrition plan tailored to your body.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="relative group px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm uppercase tracking-wider shadow-[0_8px_32px_-8px_rgba(0,212,255,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(0,212,255,0.7)] transition-all duration-300 hover:-translate-y-1"
        >
          <span className="relative z-10 flex items-center gap-2">
            Begin Diagnostic <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
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
  const recoveryScore = profile.sleepHours >= 8 ? 88 : profile.sleepHours >= 7 ? 74 : 52;
  const waterPct = Math.min(100, Math.round((waterLogged / waterTarget) * 100));

  const logWater = async (amt: number) => {
    const next = Math.min(6, Math.max(0, Number((waterLogged + amt).toFixed(2))));
    setWaterLogged(next);
    await persistDashboardState(next, mealState);
    updateProfile({ xp: xp + 10 });
  };

  const toggleMealLogged = async (mealId: string) => {
    if (!dietPlan) return;
    const nextMealState = { ...mealState, [mealId]: !(mealState[mealId] ?? false) };
    setMealState(nextMealState);
    await persistDashboardState(waterLogged, nextMealState);
  };

  const userEntries = entries.filter(e => !e.userEmail || e.userEmail === profile.email);
  const sortedProgress = [...userEntries].sort((a, b) => formatDateLabel(a.date).localeCompare(formatDateLabel(b.date)));

  const chartData = {
    labels: sortedProgress.length >= 2 ? sortedProgress.map(e => formatDateLabel(e.date)) : ['Baseline'],
    datasets: [{
      fill: true,
      label: 'Weight (kg)',
      data: sortedProgress.length >= 2 ? sortedProgress.map(e => e.weightKg) : [profile.weightKg],
      borderColor: '#00D4FF',
      backgroundColor: 'rgba(0,212,255,0.08)',
      tension: 0.4,
      pointBackgroundColor: '#00D4FF',
      pointBorderColor: '#0A0F1C',
      pointBorderWidth: 3,
      pointRadius: 5,
      pointHoverRadius: 9,
      borderWidth: 2.5,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleColor: '#f1f5f9',
        bodyColor: '#94a3b8',
        borderColor: 'rgba(0,212,255,0.3)',
        borderWidth: 1,
        padding: 14,
        cornerRadius: 12,
        displayColors: false,
      }
    },
    scales: {
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#475569', font: { size: 11 } }, border: { display: false } },
      x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 11 }, maxRotation: 45 }, border: { display: false } }
    }
  };

  const dashboardMeals = dietPlan?.meals?.slice(0, 4) ?? [
    { id: 'breakfast', time: 'Breakfast', name: 'High Protein Oats', totalCalories: 450, logged: false },
    { id: 'lunch', time: 'Lunch', name: 'Chicken & Quinoa', totalCalories: 650, logged: false },
    { id: 'dinner', time: 'Dinner', name: 'Salmon & Greens', totalCalories: 550, logged: false },
  ];

  const todayExercises = currentPlan?.days[0]?.exercises?.slice(0, 5) ?? [];

  const aiTip = recoveryScore >= 80
    ? `Your recovery score is ${recoveryScore}% — you're primed for an intense session today. Push those limits! 💪`
    : recoveryScore >= 60
    ? `Recovery at ${recoveryScore}% — moderate effort recommended. Focus on form and consistency today.`
    : `Recovery is at ${recoveryScore}% — consider active recovery or a light session. Rest is progress too. 🧘`;

  const quickActions = [
    { icon: BarChart3, label: 'Log Weight', path: '/progress', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    { icon: Dumbbell, label: 'Track Workout', path: '/workout', color: 'from-indigo-500 to-purple-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
    { icon: MessageCircle, label: 'AI Coach', path: '/coach', color: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400' },
    { icon: TrendingUp, label: 'View Progress', path: '/progress', color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto px-1 sm:px-2 lg:px-3 pb-20 pt-4 sm:pt-6 flex flex-col gap-6 sm:gap-7"
    >

      {/* ═══════════════════════════════════════════════════════════
          ██  HERO SECTION — Cinematic Banner
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        variants={fadeUp} custom={0} initial="hidden" animate="show"
        className="relative rounded-2xl sm:rounded-[1.5rem] overflow-hidden border border-white/[0.08] shadow-[0_0_80px_-20px_rgba(0,212,255,0.15)]"
      >
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0F1C] via-[#0D1321] to-[#0A0F1C]" />
        <div className="absolute inset-0 hero-mesh-pattern opacity-40" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] animate-orb-drift" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-purple-600/15 rounded-full blur-[80px] animate-orb-drift" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/8 rounded-full blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 p-5 sm:p-7 lg:p-8 xl:p-10">
          <div className="flex flex-col xl:flex-row xl:items-center gap-7 lg:gap-8 justify-between">
            {/* Left side */}
            <div className="flex-1 min-w-0">
              {/* AI Badge */}
              <motion.div
                variants={fadeUp} custom={0.5} initial="hidden" animate="show"
                className="flex flex-wrap items-center gap-2 mb-5"
              >
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.15em]">
                  <Sparkles className="w-3 h-3" /> AI-Powered
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.15em]">
                  🔥 {streak}-Day Streak
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.15em]">
                  Level {level}
                </span>
              </motion.div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] xl:text-5xl font-black tracking-tight leading-[1.1] mb-3">
                <span className="text-white">Welcome Back,</span>
                <br />
                <span className="text-gradient-hero">{profile.name}!</span>
                <span className="ml-2 inline-block animate-float">👋</span>
              </h1>

              <p className="text-slate-400 text-sm sm:text-base font-medium max-w-lg mb-6">
                Your AI fitness journey continues. Let's crush today's goals.
              </p>

              {/* Avatar + XP Row */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[2px] shadow-[0_0_20px_-4px_rgba(0,212,255,0.4)]">
                  <div className="w-full h-full rounded-[14px] bg-[#0A0F1C] flex items-center justify-center overflow-hidden">
                    {profile.avatar
                      ? <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      : <span className="text-xl font-black text-white">{profile.name.charAt(0)}</span>
                    }
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-sm text-slate-300 font-semibold">{xp} XP</span>
                    <span className="text-xs text-slate-600">•</span>
                    <span className="text-xs text-slate-500">{xpMax - xp} XP to Level {level + 1}</span>
                  </div>
                  <div className="w-full max-w-xs h-2 bg-slate-800/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPercent}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_12px_rgba(0,212,255,0.5)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side — CTA Buttons */}
            <div className="flex flex-col sm:flex-row xl:flex-col gap-3 flex-shrink-0 w-full xl:w-auto">
              <button
                onClick={() => navigate('/workout')}
                className="group relative flex-1 xl:flex-none px-5 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-sm transition-all duration-300 shadow-[0_8px_32px_-8px_rgba(0,212,255,0.5)] hover:shadow-[0_12px_40px_-8px_rgba(0,212,255,0.7)] hover:-translate-y-1 flex items-center justify-center gap-2.5"
              >
                <Play className="w-4 h-4" /> Start Workout
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </button>
              <button
                onClick={() => navigate('/nutrition')}
                className="flex-1 xl:flex-none px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-slate-200 hover:text-white font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2.5 hover:-translate-y-0.5"
              >
                <Utensils className="w-4 h-4 text-amber-400" /> View Meal Plan
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          ██  QUICK STATS BAR — 4 Metric Cards
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        variants={staggerContainer} initial="hidden" animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5"
      >
        {[
          {
            label: 'Daily Calories',
            value: `${metrics.dailyCalories.toFixed(0)}`,
            unit: 'kcal / day',
            icon: <Flame className="w-5 h-5" />,
            color: 'amber',
            sub: 'Maintenance target',
          },
          {
            label: 'Protein Goal',
            value: `${metrics.macros.protein.toFixed(0)}g`,
            unit: '/ day',
            icon: <Target className="w-5 h-5" />,
            color: 'blue',
            sub: 'Muscle preservation',
          },
          {
            label: 'Hydration',
            value: `${waterLogged.toFixed(1)}L`,
            unit: `/ ${waterTarget.toFixed(1)}L`,
            icon: <Droplet className="w-5 h-5" />,
            color: 'cyan',
            sub: `${waterPct}% of daily target`,
            action: () => logWater(0.25),
            actionLabel: '+250ml',
          },
          {
            label: 'Recovery Score',
            value: `${recoveryScore}%`,
            unit: '',
            icon: <Zap className="w-5 h-5" />,
            color: 'emerald',
            sub: recoveryScore >= 80 ? 'Optimal — train hard' : recoveryScore >= 60 ? 'Good — moderate effort' : 'Low — consider rest',
          },
        ].map((card, i) => {
          const colors: Record<string, { bg: string; border: string; text: string; bar: string; glow: string }> = {
            amber:   { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   text: 'text-amber-400',   bar: 'bg-gradient-to-r from-amber-500 to-orange-400', glow: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)]' },
            blue:    { bg: 'bg-blue-500/10',     border: 'border-blue-500/20',    text: 'text-blue-400',    bar: 'bg-gradient-to-r from-blue-500 to-indigo-400', glow: 'shadow-[0_0_20px_-4px_rgba(59,130,246,0.3)]' },
            cyan:    { bg: 'bg-cyan-500/10',     border: 'border-cyan-500/20',    text: 'text-cyan-400',    bar: 'bg-gradient-to-r from-cyan-400 to-blue-400', glow: 'shadow-[0_0_20px_-4px_rgba(0,212,255,0.3)]' },
            emerald: { bg: 'bg-emerald-500/10',  border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-gradient-to-r from-emerald-500 to-green-400', glow: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.3)]' },
          };
          const c = colors[card.color];
          return (
            <motion.div
              key={card.label}
              variants={fadeUp} custom={i + 2}
              className="group bg-[#0D1321]/80 border border-white/[0.06] rounded-2xl p-4 sm:p-5 lg:p-6 backdrop-blur-xl flex flex-col gap-3 sm:gap-4 card-glow-hover"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">{card.label}</span>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.text} border ${c.border} ${c.glow} transition-all duration-300 group-hover:scale-110`}>
                  {card.icon}
                </div>
              </div>

              <div>
                <div className="flex items-end gap-1.5">
                  <span className={`text-3xl sm:text-4xl font-black leading-none ${card.color === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>
                    {card.value}
                  </span>
                  {card.unit && <span className="text-xs sm:text-sm text-slate-600 font-semibold pb-0.5">{card.unit}</span>}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-600 font-medium mt-1.5">{card.sub}</p>
              </div>

              {card.action && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${waterPct}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
                      className={`h-full rounded-full ${c.bar} transition-all duration-500`}
                    />
                  </div>
                  <button
                    onClick={card.action}
                    className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg border ${c.bg} ${c.text} ${c.border} hover:brightness-125 transition-all active:scale-95`}
                  >
                    {card.actionLabel}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          ██  AI INSIGHTS BANNER
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        variants={fadeUp} custom={6} initial="hidden" animate="show"
        className="relative overflow-hidden rounded-2xl bg-[#0D1321]/80 border border-white/[0.06] backdrop-blur-xl gradient-border-left"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[60px]" />
        <div className="relative z-10 flex items-start gap-4 p-5 sm:p-6 pl-7 sm:pl-8">
          <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-cyan-500/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-black text-white">AI Coach Insight</h3>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-wider">Live</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">{aiTip}</p>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          ██  MAIN CONTENT — Workout + Meals (2-col)
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ── TODAY'S WORKOUT ─────────────────────────── */}
        <motion.div
          variants={fadeUp} custom={7} initial="hidden" animate="show"
          className="xl:col-span-7 bg-[#0D1321]/80 border border-white/[0.06] rounded-[1.5rem] p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-blue-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_-6px_rgba(99,102,241,0.3)]">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Today's Workout</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">AI-Optimized Training Split</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/workout')}
              className="group px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_16px_-4px_rgba(99,102,241,0.4)] hover:shadow-[0_6px_24px_-4px_rgba(99,102,241,0.6)] hover:-translate-y-0.5 flex items-center gap-1.5"
            >
              Start <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {todayExercises.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {todayExercises.map((ex, idx) => (
                <div
                  key={idx}
                  className="group flex items-center justify-between p-4 sm:p-5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-indigo-500/25 hover:bg-indigo-500/[0.03] transition-all duration-300"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-white font-bold text-sm">{ex.exercise.name}</h4>
                      <p className="text-slate-600 text-xs font-semibold mt-0.5">{ex.sets} sets × {ex.reps} reps</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg">
                    {ex.recommendedWeight.min}–{ex.recommendedWeight.max} kg
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-14">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mx-auto mb-4">
                <Dumbbell className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-500 font-bold text-sm mb-1">No workout plan yet</p>
              <p className="text-slate-600 text-xs mb-6">Go to Workout page to generate your AI plan</p>
              <button
                onClick={() => navigate('/workout')}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all hover:-translate-y-0.5"
              >
                Generate Plan →
              </button>
            </div>
          )}
        </motion.div>

        {/* ── TODAY'S MEALS ───────────────────────────── */}
        <motion.div
          variants={fadeUp} custom={8} initial="hidden" animate="show"
          className="xl:col-span-5 bg-[#0D1321]/80 border border-white/[0.06] rounded-[1.5rem] p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 shadow-[0_0_20px_-6px_rgba(245,158,11,0.3)]">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Today's Meals</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Track & check off meals</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {dashboardMeals.map((meal) => {
              const isLogged = !!(mealState[meal.id] ?? meal.logged);
              return (
                <div
                  key={meal.id}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-xl border transition-all duration-300 ${
                    isLogged
                      ? 'bg-emerald-500/5 border-emerald-500/15'
                      : 'bg-white/[0.02] border-white/[0.04] hover:border-amber-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1.5 h-10 rounded-full flex-shrink-0 transition-colors duration-300 ${isLogged ? 'bg-emerald-500' : 'bg-slate-700/60'}`} />
                    <div>
                      <span className="text-[9px] font-extrabold uppercase text-slate-600 tracking-[0.15em] block">{meal.time}</span>
                      <h4 className={`font-bold text-sm mt-0.5 transition-all ${isLogged ? 'text-slate-500 line-through' : 'text-white'}`}>{meal.name}</h4>
                      {'totalCalories' in meal && (
                        <p className="text-slate-400 text-[11px] font-semibold mt-0.5">{(meal as any).totalCalories} kcal</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMealLogged(meal.id)}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                      isLogged
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]'
                        : 'bg-white/[0.03] border-white/10 text-slate-500 hover:text-white hover:border-slate-500'
                    }`}
                  >
                    {isLogged ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => navigate('/nutrition')}
            className="mt-5 w-full py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 text-slate-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            Full Nutrition Plan <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ██  BOTTOM ROW — Chart + Quick Actions
          ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ── WEIGHT TREND CHART ─────────────────────── */}
        <motion.div
          variants={fadeUp} custom={9} initial="hidden" animate="show"
          className="xl:col-span-8 bg-[#0D1321]/80 border border-white/[0.06] rounded-[1.5rem] p-5 sm:p-6 backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-7">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_-6px_rgba(0,212,255,0.3)]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Weight Trend</h2>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Progress over time</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/progress')}
              className="text-cyan-400 text-xs font-bold uppercase tracking-wider hover:text-cyan-300 transition-colors flex items-center gap-1 group"
            >
              View All <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="h-56 sm:h-64 w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
          {sortedProgress.length < 2 && (
            <p className="text-center text-slate-400 text-xs font-semibold mt-4">
              Log more progress entries to see your weight trend graph
            </p>
          )}
        </motion.div>

        {/* ── QUICK ACTIONS ──────────────────────────── */}
        <motion.div
          variants={fadeUp} custom={10} initial="hidden" animate="show"
          className="xl:col-span-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <motion.button
                key={action.label}
                variants={fadeUp} custom={10 + i}
                onClick={() => navigate(action.path)}
                className="group bg-[#0D1321]/80 border border-white/[0.06] rounded-2xl p-5 backdrop-blur-xl flex flex-col items-center gap-3 card-glow-hover text-center"
              >
                <div className={`w-11 h-11 rounded-xl ${action.bg} border ${action.border} ${action.text} flex items-center justify-center transition-all duration-300 group-hover:scale-110`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{action.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

    </motion.div>
  );
}
