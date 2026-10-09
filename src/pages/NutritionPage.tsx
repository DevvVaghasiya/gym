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
  Clock, PieChart, Apple, Info
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
    setTimeout(() => setToastMsg(''), 3200);
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
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400" />
        <h3 className="text-xl font-black text-white">Profile Setup Required</h3>
        <p className="max-w-xs text-xs text-slate-400">Complete your profile to generate your personalized AI nutrition plan.</p>
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

  // Macro Calculations
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
            className="fixed right-6 top-6 z-[70] flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-slate-900/95 px-5 py-3 text-xs font-bold text-emerald-300 shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Card */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" /> Adaptive Nutrition Coach
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Diet & Nutrition Plan</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Targeting <span className="font-bold text-white">{dietPlan.dailyCalories} kcal/day</span> calibrated for{' '}
            <span className="font-semibold text-violet-400 capitalize">{(profile.goal ?? 'fitness').replace('_', ' ')}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDietPlan(generateAIDietPlan(profile));
              toast('Full menu regenerated with new meal ideas!');
            }}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white active:scale-[0.99]"
          >
            <RefreshCw className="h-4 w-4 text-violet-400" /> Regenerate Menu
          </button>
        </div>
      </header>

      {/* Macronutrient Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Calories Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Flame className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Calories</span>
            </div>
            <span className="text-[11px] font-bold text-orange-400">{pct(totalCals, dietPlan.dailyCalories)}%</span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{totalCals}</span>
              <span className="text-xs font-semibold text-slate-500">/ {dietPlan.dailyCalories} kcal</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {Math.max(0, dietPlan.dailyCalories - totalCals)} kcal remaining
            </p>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct(totalCals, dietPlan.dailyCalories)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
            />
          </div>
        </div>

        {/* Protein Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Protein</span>
            </div>
            <span className="text-[11px] font-bold text-blue-400">{pct(totalP, dietPlan.protein)}%</span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{totalP}g</span>
              <span className="text-xs font-semibold text-slate-500">/ {dietPlan.protein}g</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {Math.max(0, dietPlan.protein - totalP)}g left today
            </p>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct(totalP, dietPlan.protein)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
            />
          </div>
        </div>

        {/* Carbohydrates Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Utensils className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Carbs</span>
            </div>
            <span className="text-[11px] font-bold text-violet-400">{pct(totalC, dietPlan.carbs)}%</span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{totalC}g</span>
              <span className="text-xs font-semibold text-slate-500">/ {dietPlan.carbs}g</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {Math.max(0, dietPlan.carbs - totalC)}g remaining
            </p>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct(totalC, dietPlan.carbs)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
            />
          </div>
        </div>

        {/* Healthy Fats Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Apple className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fats</span>
            </div>
            <span className="text-[11px] font-bold text-rose-400">{pct(totalF, dietPlan.fat)}%</span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{totalF}g</span>
              <span className="text-xs font-semibold text-slate-500">/ {dietPlan.fat}g</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {Math.max(0, dietPlan.fat - totalF)}g remaining
            </p>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct(totalF, dietPlan.fat)}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500"
            />
          </div>
        </div>
      </div>

      {/* Hydration Tracker Card */}
      <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-cyan-950/40 p-6 backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/15 text-cyan-400 shadow-md">
              <Droplet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">Daily Water Intake</h3>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  {waterPct}% Complete
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Logged <span className="font-bold text-cyan-300">{water.toFixed(2)} L</span> of your{' '}
                <span className="font-semibold text-white">{waterTarget.toFixed(1)} L</span> daily recommendation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => addWater(0.25)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-300 transition-all hover:bg-cyan-500/20 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> 250 ml
            </button>
            <button
              onClick={() => addWater(0.5)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2.5 text-xs font-bold text-cyan-200 transition-all hover:bg-cyan-500/30 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" /> 500 ml
            </button>
            <button
              onClick={() => addWater(1.0)}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all hover:bg-cyan-400 active:scale-95 shadow-md shadow-cyan-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> 1.0 L
            </button>
          </div>
        </div>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-950/70 border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${waterPct}%` }}
            transition={{ duration: 0.6 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          />
        </div>
      </section>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Meal Plan List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Section Header & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1.5 rounded-full bg-violet-500" />
              <h2 className="text-lg font-black tracking-tight text-white">Daily Meal Schedule</h2>
            </div>

            <div className="flex items-center gap-1 rounded-2xl border border-white/10 bg-slate-900/80 p-1 text-xs font-bold">
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

          {/* Meals Cards */}
          <div className="space-y-4">
            {filteredMeals.map((meal, idx) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`overflow-hidden rounded-3xl border transition-all ${
                  meal.logged
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : meal.skipped
                    ? 'border-white/5 bg-slate-900/40 opacity-70'
                    : 'border-white/10 bg-slate-900/80 hover:border-white/20'
                }`}
              >
                {/* Meal Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
                        meal.logged
                          ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-violet-400'
                      }`}
                    >
                      {meal.logged ? <CheckCircle2 className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-bold text-violet-400">
                          <Clock className="h-3 w-3" /> {meal.time}
                        </span>
                        {meal.skipped && (
                          <span className="rounded-full bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
                            Skipped
                          </span>
                        )}
                        {meal.logged && (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                            Logged
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-white mt-0.5">{meal.name}</h3>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleRegenerate(meal.id)}
                      title="Swap / Regenerate Meal"
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                    >
                      <RotateCw className="h-4 w-4" />
                    </button>
                    {!meal.logged && (
                      <button
                        onClick={() => handleSkip(meal.id)}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-400 transition-all hover:border-rose-500/30 hover:text-rose-300"
                      >
                        Skip
                      </button>
                    )}
                    <button
                      onClick={() => handleLog(meal.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-md active:scale-95 ${
                        meal.logged
                          ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                          : 'bg-violet-600 text-white hover:bg-violet-500'
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

                {/* Meal Body */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Ingredients Column */}
                  <div className="md:col-span-8 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Ingredients & Portions</p>
                    <div className="space-y-1.5">
                      {meal.foods.map((food, fi) => (
                        <div
                          key={fi}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-2 text-xs"
                        >
                          <span className="font-semibold text-slate-200">
                            {food.name} <span className="text-slate-500 text-[11px]">({food.amount})</span>
                          </span>
                          <span className="font-bold text-slate-400">
                            {food.calories} kcal · <span className="text-blue-400">{food.protein}g P</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary Column */}
                  <div className="md:col-span-4 flex flex-col justify-center space-y-2 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Meal Macros</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400">Energy</span>
                      <span className="font-black text-white">{meal.totalCalories} kcal</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-400">Protein</span>
                      <span className="font-black text-blue-300">{meal.totalProtein}g</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-violet-400">Carbs</span>
                      <span className="font-black text-violet-300">{meal.totalCarbs}g</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-rose-400">Fats</span>
                      <span className="font-black text-rose-300">{meal.totalFat}g</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredMeals.length === 0 && (
              <div className="rounded-3xl border border-white/8 bg-slate-900/60 p-12 text-center text-sm font-semibold text-slate-400">
                No meals found for the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stack & Micronutrients */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Recommended Supplement Stack */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Recommended Stack</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Targeted Performance</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {dietPlan.supplements.map((supp, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSupp(supp)}
                  className="group w-full rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white transition-colors group-hover:text-amber-300">{supp.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{supp.dosage} · {supp.timing}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Micronutrients */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Daily Micronutrients</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Essential Minerals</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Vitamin D3', val: dietPlan.micronutrients?.vitaminD || '2000 IU' },
                { label: 'Magnesium', val: dietPlan.micronutrients?.magnesium || '350 mg' },
                { label: 'Zinc', val: dietPlan.micronutrients?.zinc || '20 mg' },
                { label: 'Omega-3', val: dietPlan.micronutrients?.omega3 || '1000 mg' },
              ].map((m, i) => (
                <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <p className="text-sm font-black text-white">{m.val}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Supplement Modal */}
      <AnimatePresence>
        {selectedSupp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl"
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
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
