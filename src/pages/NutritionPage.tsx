import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { generateAIDietPlan, regenerateMealInPlan, recalculateSkippedMealMacros } from '../engine/dietGenerator';
import { fetchDailyStats, saveDailyStats } from '../lib/api';
import type { SupplementRecommendation } from '../types/nutrition';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, RotateCw, AlertTriangle, CheckCircle2, Droplet, Plus,
  Sparkles, Zap, ChevronRight, ShieldCheck, Flame, Check, RefreshCw, X,
  Clock, Info, Dumbbell, ShieldAlert, Award
} from 'lucide-react';

export default function NutritionPage() {
  const profile = useUserStore(s => s.profile);
  const updateProfile = useUserStore(s => s.updateProfile);
  const token = useAuthStore(s => s.token);
  const dietPlan = useNutritionStore(s => s.currentPlan);
  const setDietPlan = useNutritionStore(s => s.setPlan);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [toastMsg, setToastMsg] = useState('');
  const [selectedSupp, setSelectedSupp] = useState<SupplementRecommendation | null>(null);
  const [mealFilter, setMealFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [water, setWater] = useState<number>(() => {
    const s = localStorage.getItem(`fitai_water_${new Date().toISOString().slice(0, 10)}`);
    return s ? parseFloat(s) || 0 : 0;
  });

  useEffect(() => {
    if (profile && !dietPlan) setDietPlan(generateAIDietPlan(profile));
  }, [profile, dietPlan]);

  useEffect(() => {
    if (!profile) return;
    const local = localStorage.getItem(`fitai_water_${todayStr}`);
    if (local) setWater(parseFloat(local) || 0);
    fetchDailyStats(token, todayStr)
      .then(s => {
        if (typeof s.waterIntakeLiters === 'number' && s.waterIntakeLiters > 0) {
          setWater(s.waterIntakeLiters);
          localStorage.setItem(`fitai_water_${todayStr}`, s.waterIntakeLiters.toString());
        }
      })
      .catch(() => {});
  }, [profile, token]);

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const mealSnapshot = (plan: typeof dietPlan) =>
    (plan?.meals ?? []).map(m => ({ id: m.id, time: m.time, name: m.name, logged: !!m.logged, skipped: !!m.skipped }));

  const handleRegenerate = (id: string) => {
    if (!dietPlan || !profile) return;
    setDietPlan(regenerateMealInPlan(dietPlan, id, profile.foodPreference || 'vegetarian'));
    toast('Meal regenerated with fresh ingredients!');
  };

  const handleSkip = (id: string) => {
    if (!dietPlan) return;
    setDietPlan(recalculateSkippedMealMacros(dietPlan, id));
    toast('Meal skipped – remaining macros redistributed.');
  };

  const handleLog = async (id: string) => {
    if (!dietPlan) return;
    const updated = {
      ...dietPlan,
      meals: dietPlan.meals.map(m => {
        if (m.id !== id) return m;
        if (!m.logged) updateProfile({ xp: (profile?.xp ?? 0) + 30 });
        return { ...m, logged: !m.logged, skipped: false };
      }),
    };
    setDietPlan(updated);
    try {
      await saveDailyStats({ date: todayStr, waterIntakeLiters: water, meals: mealSnapshot(updated) }, token);
    } catch {}
    toast('Meal logged successfully!');
  };

  const addWater = async (amt: number) => {
    const next = Math.min(6, +(water + amt).toFixed(2));
    setWater(next);
    localStorage.setItem(`fitai_water_${todayStr}`, next.toString());
    toast(`+${(amt * 1000).toFixed(0)} ml water logged!`);
    try {
      await saveDailyStats({ date: todayStr, waterIntakeLiters: next, meals: mealSnapshot(dietPlan) }, token);
    } catch {}
  };

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center font-sans">
        <AlertTriangle className="h-12 w-12 text-amber-400" />
        <h3 className="text-xl font-black text-white">Profile Setup Required</h3>
        <p className="max-w-xs text-xs text-slate-400">Complete your profile to generate your custom AI nutrition plan.</p>
      </div>
    );
  }

  if (!dietPlan) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-400">
        Generating your custom AI nutrition plan…
      </div>
    );
  }

  // Macro Totals
  const sum = (key: 'totalCalories' | 'totalProtein' | 'totalCarbs' | 'totalFat') =>
    dietPlan.meals.reduce((a, m) => (m.logged ? a + m[key] : a), 0);

  const totalCals = sum('totalCalories');
  const totalP = sum('totalProtein');
  const totalC = sum('totalCarbs');
  const totalF = sum('totalFat');

  const pct = (v: number, t: number) => Math.min(100, Math.round((v / (t || 1)) * 100));

  const waterTarget = profile.dailyWaterIntakeLiters ?? 3.0;
  const waterPct = pct(water, waterTarget);

  const filteredMeals = dietPlan.meals.filter(m => {
    if (mealFilter === 'pending') return !m.logged;
    if (mealFilter === 'completed') return m.logged;
    return true;
  });

  const pendingCount = dietPlan.meals.filter(m => !m.logged).length;
  const completedCount = dietPlan.meals.filter(m => m.logged).length;

  const mealIcons: Record<string, string> = {
    breakfast: '🥣',
    lunch: '🥗',
    snack: '🥪',
    dinner: '🍲',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-7xl space-y-6 pb-20 font-sans px-2 sm:px-4"
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed right-6 top-6 z-[80] flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-slate-900/95 px-5 py-3 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-2xl"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl shadow-xl">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Precision Nutrition Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Daily Diet & Nutrition</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Calibrated for <span className="font-bold text-white capitalize">{(profile.goal ?? 'fitness').replace('_', ' ')}</span> · Target:{' '}
            <span className="font-extrabold text-violet-400">{dietPlan.dailyCalories} kcal</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDietPlan(generateAIDietPlan(profile));
              toast('Full diet plan regenerated!');
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all hover:bg-white/10 hover:text-white active:scale-95 shadow-sm"
          >
            <RefreshCw className="h-4 w-4 text-violet-400" /> Regenerate Menu
          </button>
        </div>
      </header>

      {/* ── MACRO & CALORIE DASHBOARD ── */}
      <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-5 w-1.5 rounded-full bg-violet-500" />
            <h2 className="text-base font-black tracking-tight text-white">Daily Macronutrient Targets</h2>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {completedCount} of {dietPlan.meals.length} Meals Logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Calories Big Tile */}
          <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-slate-900/90 to-slate-950 p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  <Flame className="h-5 w-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-orange-200">Calories</span>
              </div>
              <span className="text-xs font-black text-orange-400">{pct(totalCals, dietPlan.dailyCalories)}%</span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{totalCals}</span>
                <span className="text-xs font-bold text-slate-400">/ {dietPlan.dailyCalories} kcal</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                {Math.max(0, dietPlan.dailyCalories - totalCals)} kcal remaining today
              </p>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(totalCals, dietPlan.dailyCalories)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]"
              />
            </div>
          </div>

          {/* Protein Tile */}
          <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 via-slate-900/90 to-slate-950 p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Zap className="h-5 w-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-200">Protein</span>
              </div>
              <span className="text-xs font-black text-blue-400">{pct(totalP, dietPlan.protein)}%</span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{totalP}g</span>
                <span className="text-xs font-bold text-slate-400">/ {dietPlan.protein}g</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                {Math.max(0, dietPlan.protein - totalP)}g to hit target
              </p>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(totalP, dietPlan.protein)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
              />
            </div>
          </div>

          {/* Carbs Tile */}
          <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-slate-900/90 to-slate-950 p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
                  <Utensils className="h-5 w-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-violet-200">Carbs</span>
              </div>
              <span className="text-xs font-black text-violet-400">{pct(totalC, dietPlan.carbs)}%</span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{totalC}g</span>
                <span className="text-xs font-bold text-slate-400">/ {dietPlan.carbs}g</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                {Math.max(0, dietPlan.carbs - totalC)}g remaining budget
              </p>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(totalC, dietPlan.carbs)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
              />
            </div>
          </div>

          {/* Fats Tile */}
          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 via-slate-900/90 to-slate-950 p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Flame className="h-5 w-5" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-rose-200">Healthy Fats</span>
              </div>
              <span className="text-xs font-black text-rose-400">{pct(totalF, dietPlan.fat)}%</span>
            </div>

            <div className="my-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-white">{totalF}g</span>
                <span className="text-xs font-bold text-slate-400">/ {dietPlan.fat}g</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                {Math.max(0, dietPlan.fat - totalF)}g remaining budget
              </p>
            </div>

            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/40 border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(totalF, dietPlan.fat)}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── HYDRATION TRACKER ── */}
      <section className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-blue-950/40 via-slate-900/90 to-cyan-950/40 p-6 sm:p-7 backdrop-blur-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20">
              <Droplet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Daily Hydration Tracker</h3>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/15 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                  {waterPct}% Complete
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Logged <span className="font-bold text-cyan-300">{water.toFixed(2)} L</span> of your{' '}
                <span className="font-semibold text-white">{waterTarget.toFixed(1)} L</span> target
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => addWater(0.25)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-300 transition-all hover:bg-cyan-500/25 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> 250 ml
            </button>
            <button
              onClick={() => addWater(0.5)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2.5 text-xs font-bold text-cyan-200 transition-all hover:bg-cyan-500/35 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> 500 ml
            </button>
            <button
              onClick={() => addWater(1.0)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all hover:bg-cyan-400 active:scale-95 shadow-lg shadow-cyan-500/30"
            >
              <Plus className="h-3.5 w-3.5" /> 1.0 L
            </button>
          </div>
        </div>

        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-950/80 border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${waterPct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
          />
        </div>
      </section>

      {/* ── 2-COLUMN MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Meal Schedule */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1.5 rounded-full bg-violet-500" />
              <h2 className="text-lg font-black tracking-tight text-white">Daily Meal Schedule</h2>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/80 p-1 text-xs font-bold shadow-md">
              {[
                { key: 'all', label: `All (${dietPlan.meals.length})` },
                { key: 'pending', label: `Pending (${pendingCount})` },
                { key: 'completed', label: `Logged (${completedCount})` },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setMealFilter(f.key as typeof mealFilter)}
                  className={`rounded-xl px-3.5 py-1.5 transition-all ${
                    mealFilter === f.key
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meal Cards */}
          <div className="space-y-4">
            {filteredMeals.map((meal, idx) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`overflow-hidden rounded-3xl border transition-all shadow-xl ${
                  meal.logged
                    ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-900/90 to-slate-950'
                    : meal.skipped
                    ? 'border-white/5 bg-slate-900/40 opacity-70'
                    : 'border-white/12 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950/90 hover:border-violet-500/30'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl shadow-md border ${
                        meal.logged
                          ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                          : 'border-violet-500/30 bg-violet-500/10'
                      }`}
                    >
                      {mealIcons[meal.name.toLowerCase()] || '🍽️'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-violet-400">
                          <Clock className="h-3 w-3" /> {meal.time}
                        </span>
                        {meal.skipped && (
                          <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-300">
                            Skipped
                          </span>
                        )}
                        {meal.logged && (
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">
                            Logged ✓
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-white mt-0.5">{meal.name}</h3>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleRegenerate(meal.id)}
                      title="Swap meal with AI alternative"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    {!meal.logged && (
                      <button
                        onClick={() => handleSkip(meal.id)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 transition-all hover:border-rose-500/30 hover:text-rose-300 active:scale-95"
                      >
                        Skip
                      </button>
                    )}
                    <button
                      onClick={() => handleLog(meal.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-extrabold transition-all shadow-md active:scale-95 ${
                        meal.logged
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 shadow-violet-500/20'
                      }`}
                    >
                      {meal.logged ? (
                        <>
                          <Check className="h-4 w-4" /> Logged
                        </>
                      ) : (
                        'Log Meal'
                      )}
                    </button>
                  </div>
                </div>

                {/* Body: Ingredients & Macro Pills */}
                <div className="p-6 space-y-4">
                  {/* Ingredients list */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ingredients & Quantities</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {meal.foods.map((food, fi) => (
                        <div
                          key={fi}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 text-xs"
                        >
                          <span className="font-bold text-slate-200">
                            {food.name} <span className="text-slate-400 font-normal">({food.amount})</span>
                          </span>
                          <span className="font-extrabold text-slate-300 ml-2">
                            {food.calories} kcal · <span className="text-blue-400">{food.protein}g P</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meal Macro Pills Bar */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mr-2">Meal Nutrition:</span>
                    <span className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-1 text-xs font-black text-orange-300">
                      🔥 {meal.totalCalories} kcal
                    </span>
                    <span className="rounded-xl border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-300">
                      ⚡ {meal.totalProtein}g Protein
                    </span>
                    <span className="rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">
                      🌾 {meal.totalCarbs}g Carbs
                    </span>
                    <span className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-300">
                      🥑 {meal.totalFat}g Fats
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredMeals.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-12 text-center text-sm font-semibold text-slate-400">
                No meals found for the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stack & Micronutrients */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Supplement Stack */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Recommended Stack</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Performance Support</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {dietPlan.supplements.map((supp, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSupp(supp)}
                  className="group w-full rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-left transition-all hover:border-amber-500/40 hover:bg-amber-500/10 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white transition-colors group-hover:text-amber-300">{supp.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{supp.dosage} · {supp.timing}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Micronutrients */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-2xl shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Essential Minerals</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Daily Optimal RDA</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Vitamin D3', val: dietPlan.micronutrients?.vitaminD || '2000 IU' },
                { label: 'Magnesium', val: dietPlan.micronutrients?.magnesium || '350 mg' },
                { label: 'Zinc', val: dietPlan.micronutrients?.zinc || '20 mg' },
                { label: 'Omega-3', val: dietPlan.micronutrients?.omega3 || '1000 mg' },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3.5 text-center">
                  <p className="text-sm font-black text-white">{m.val}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coach Insight Card */}
          <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-slate-900/90 to-slate-950 p-6 backdrop-blur-2xl shadow-xl space-y-2">
            <div className="flex items-center gap-2 text-violet-300">
              <Award className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Coach Nutrition Tip</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300 font-medium">
              Aim for 25–40g of protein distributed across each meal to trigger muscle protein synthesis consistently throughout your recovery windows.
            </p>
          </div>
        </div>
      </div>

      {/* Supplement Modal */}
      <AnimatePresence>
        {selectedSupp && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl"
            onClick={() => setSelectedSupp(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl"
            >
              <button
                onClick={() => setSelectedSupp(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">{selectedSupp.name}</h3>
                  <p className="text-xs text-slate-400">{selectedSupp.timing}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recommended Dose</p>
                  <p className="text-sm font-bold text-white">{selectedSupp.dosage}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Primary Benefits</p>
                  <p className="text-xs font-medium leading-relaxed text-slate-300">{selectedSupp.benefits}</p>
                </div>

                {selectedSupp.safetyWarning && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <p className="text-xs font-bold text-rose-300 mb-0.5">Safety & Instructions</p>
                    <p className="text-xs leading-relaxed text-rose-200/80">{selectedSupp.safetyWarning}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSupp(null)}
                className="mt-6 w-full rounded-2xl bg-white py-3 text-xs font-extrabold uppercase tracking-widest text-slate-950 transition hover:bg-slate-200"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
