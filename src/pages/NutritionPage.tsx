import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { generateAIDietPlan, regenerateMealInPlan, recalculateSkippedMealMacros } from '../engine/dietGenerator';
import { fetchDailyStats, saveDailyStats } from '../lib/api';
import type { SupplementRecommendation } from '../types/nutrition';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Utensils, RotateCw, AlertTriangle, CheckCircle, Droplet, Plus,
  Sparkles, Zap, ChevronRight, ShieldCheck, Activity, Coffee,
  Flame, Check, RefreshCw, X,
} from 'lucide-react';

/* ── tiny helpers ─────────────────────────────────────────────── */

function ProgressBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        className={`h-full rounded-full ${colorClass}`}
      />
    </div>
  );
}

/* ── main component ───────────────────────────────────────────── */

export default function NutritionPage() {
  const profile       = useUserStore(s => s.profile);
  const updateProfile = useUserStore(s => s.updateProfile);
  const token         = useAuthStore(s => s.token);
  const dietPlan      = useNutritionStore(s => s.currentPlan);
  const setDietPlan   = useNutritionStore(s => s.setPlan);

  const todayStr = new Date().toISOString().slice(0, 10);

  const [toastMsg, setToastMsg]   = useState('');
  const [selectedSupp, setSelectedSupp] = useState<SupplementRecommendation | null>(null);
  const [mealFilter, setMealFilter]     = useState<'all' | 'pending' | 'completed'>('all');
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

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3200); };

  const mealSnapshot = (plan: typeof dietPlan) =>
    (plan?.meals ?? []).map(m => ({ id: m.id, time: m.time, name: m.name, logged: !!m.logged, skipped: !!m.skipped }));

  const handleRegenerate = (id: string) => {
    if (!dietPlan || !profile) return;
    setDietPlan(regenerateMealInPlan(dietPlan, id, profile.foodPreference || 'vegetarian'));
    toast('Meal regenerated!');
  };

  const handleSkip = (id: string) => {
    if (!dietPlan) return;
    setDietPlan(recalculateSkippedMealMacros(dietPlan, id));
    toast('Meal skipped – macros redistributed.');
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
    try { await saveDailyStats({ date: todayStr, waterIntakeLiters: water, meals: mealSnapshot(updated) }, token); } catch {}
    toast('Meal status updated!');
  };

  const addWater = async (amt: number) => {
    const next = Math.min(6, +(water + amt).toFixed(2));
    setWater(next);
    localStorage.setItem(`fitai_water_${todayStr}`, next.toString());
    toast(`+${(amt * 1000).toFixed(0)} ml logged!`);
    try { await saveDailyStats({ date: todayStr, waterIntakeLiters: next, meals: mealSnapshot(dietPlan) }, token); } catch {}
  };

  /* guards */
  if (!profile) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertTriangle className="h-12 w-12 animate-bounce text-amber-400" />
      <h3 className="text-xl font-black text-white">Profile Setup Required</h3>
      <p className="max-w-xs text-sm text-slate-400">Complete your profile to generate your personalized AI nutrition plan.</p>
    </div>
  );
  if (!dietPlan) return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Building your diet plan…</div>
  );

  /* derived */
  const sum = (key: 'totalCalories' | 'totalProtein' | 'totalCarbs' | 'totalFat') =>
    dietPlan.meals.reduce((a, m) => (m.logged ? a + m[key] : a), 0);

  const totalCals = sum('totalCalories');
  const totalP    = sum('totalProtein');
  const totalC    = sum('totalCarbs');
  const totalF    = sum('totalFat');

  const pct = (v: number, t: number) => Math.min(100, Math.round((v / t) * 100));

  const waterTarget = profile.dailyWaterIntakeLiters ?? 3.0;
  const waterPct    = pct(water, waterTarget);

  const macros = [
    { label: 'Calories',      cur: totalCals, tgt: dietPlan.dailyCalories, unit: 'kcal', p: pct(totalCals, dietPlan.dailyCalories), bar: 'bg-gradient-to-r from-amber-500 to-orange-500',   icon: Flame,    ring: 'border-amber-500/30  bg-amber-500/10  text-amber-400'   },
    { label: 'Protein',       cur: totalP,    tgt: dietPlan.protein,       unit: 'g',    p: pct(totalP, dietPlan.protein),           bar: 'bg-gradient-to-r from-blue-500 to-indigo-500',    icon: Activity, ring: 'border-blue-500/30   bg-blue-500/10   text-blue-400'    },
    { label: 'Carbohydrates', cur: totalC,    tgt: dietPlan.carbs,         unit: 'g',    p: pct(totalC, dietPlan.carbs),             bar: 'bg-gradient-to-r from-violet-500 to-purple-600',  icon: Utensils, ring: 'border-violet-500/30 bg-violet-500/10 text-violet-400'  },
    { label: 'Healthy Fats',  cur: totalF,    tgt: dietPlan.fat,           unit: 'g',    p: pct(totalF, dietPlan.fat),               bar: 'bg-gradient-to-r from-rose-500 to-pink-500',      icon: Coffee,   ring: 'border-rose-500/30   bg-rose-500/10   text-rose-400'    },
  ];

  const filteredMeals = dietPlan.meals.filter(m => {
    if (mealFilter === 'pending')   return !m.logged;
    if (mealFilter === 'completed') return  m.logged;
    return true;
  });

  const pending   = dietPlan.meals.filter(m => !m.logged).length;
  const completed = dietPlan.meals.filter(m =>  m.logged).length;

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-4 pb-6"
    >

      {/* toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
            className="fixed right-5 top-5 z-[60] flex items-center gap-2.5 rounded-2xl border border-cyan-500/40 bg-slate-900/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-200">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <header className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/60 px-5 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-cyan-300">
            <Sparkles className="h-3 w-3" /> Adaptive Nutrition Engine
          </span>
          <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">
            Diet &amp; Nutrition Plan
          </h1>
          <p className="text-xs text-slate-400">
            Metabolic target: <span className="font-bold text-white">{dietPlan.dailyCalories} kcal / day</span>
            {' '}— tailored for <span className="font-semibold capitalize text-cyan-300">{(profile.goal ?? 'fitness').replace('_', ' ')}</span>
          </p>
        </div>
        <button
          onClick={() => setDietPlan(generateAIDietPlan(profile))}
          className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white sm:self-center"
        >
          <RefreshCw className="h-4 w-4" /> Reset Menu
        </button>
      </header>

      {/* ══ HYDRATION ═══════════════════════════════════════════ */}
      <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/50 via-slate-900/70 to-cyan-950/50 px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* info */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/15 text-cyan-400">
              <Droplet className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-white">Daily Hydration Log</span>
                <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                  {waterPct}% of goal
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Logged <span className="font-bold text-cyan-300">{water.toFixed(2)} L</span>
                {' '}of <span className="font-semibold text-white">{waterTarget.toFixed(1)} L</span>
              </p>
            </div>
          </div>
          {/* buttons */}
          <div className="flex items-center gap-2">
            <button onClick={() => addWater(0.25)} className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-blue-500/25 active:scale-95">
              <Plus className="h-3.5 w-3.5" /> 250 ml
            </button>
            <button onClick={() => addWater(0.5)} className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/20 px-3.5 py-2 text-xs font-bold text-cyan-200 shadow transition hover:bg-blue-500/35 active:scale-95">
              <Plus className="h-3.5 w-3.5" /> 500 ml
            </button>
          </div>
        </div>
        {/* bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full border border-white/[0.04] bg-slate-950/70">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${waterPct}%` }} transition={{ duration: 0.65, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
          />
        </div>
      </section>

      {/* ══ MACRO STAT CARDS ════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {macros.map((g, i) => (
          <motion.div
            key={g.label}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex min-h-[118px] flex-col justify-between gap-2 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 shadow-lg transition hover:border-white/[0.14]"
          >
            {/* label + icon */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">{g.label}</span>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${g.ring}`}>
                <g.icon className="h-3.5 w-3.5" />
              </div>
            </div>
            {/* value */}
            <div className="leading-none">
              <span className="text-xl font-black text-white">{g.cur}</span>
              <span className="ml-1 text-[11px] font-semibold text-slate-500">/ {g.tgt}{g.unit}</span>
            </div>
            {/* bar + pct */}
            <div className="space-y-1">
              <ProgressBar pct={g.p} colorClass={g.bar} />
              <div className="flex items-center justify-between text-[9px] font-bold">
                <span className="text-slate-500">{g.tgt - g.cur > 0 ? `${g.tgt - g.cur}${g.unit} left` : '✓ Done'}</span>
                <span className={g.p >= 100 ? 'text-emerald-400' : 'text-slate-500'}>{g.p}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ══ MAIN 2-COL ══════════════════════════════════════════
          Left  : meal list   (fills remaining width, scrolls)
          Right : sidebar     (340 px, sticky top)
      ══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]">

        {/* ── MEALS ─────────────────────────────────────────── */}
        <div className="min-w-0 space-y-3">

          {/* section header + filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1 rounded-full bg-blue-500" />
              <h2 className="text-base font-black tracking-tight text-white">Today's Meals</h2>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-slate-900/80 p-1 text-xs font-bold">
              {[
                { key: 'all',       label: `All (${dietPlan.meals.length})` },
                { key: 'pending',   label: `Pending (${pending})`           },
                { key: 'completed', label: `Done (${completed})`            },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setMealFilter(f.key as typeof mealFilter)}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    mealFilter === f.key ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* meal cards */}
          <div className="space-y-3">
            {filteredMeals.map((meal, idx) => (
              <motion.div
                key={meal.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  meal.logged
                    ? 'border-emerald-500/30 bg-emerald-950/20'
                    : meal.skipped
                    ? 'border-rose-500/15 bg-slate-900/40 opacity-70'
                    : 'border-white/[0.08] bg-slate-900/60 hover:border-white/[0.16]'
                }`}
              >
                {/* ── header row ── */}
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
                  {/* left: icon + name — truncates gracefully */}
                  <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      meal.logged
                        ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}>
                      {meal.logged ? <CheckCircle className="h-4 w-4" /> : <Utensils className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-400">
                          {meal.time}
                        </span>
                        {meal.skipped && (
                          <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-400">
                            Skipped
                          </span>
                        )}
                      </div>
                      <h3 className="truncate text-sm font-extrabold leading-tight tracking-tight text-white">{meal.name}</h3>
                    </div>
                  </div>

                  {/* right: actions — shrink-0 so they never collapse */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => handleRegenerate(meal.id)}
                      title="Regenerate"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleSkip(meal.id)}
                      className="whitespace-nowrap rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:border-rose-500/30 hover:text-rose-400"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => handleLog(meal.id)}
                      className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide shadow transition active:scale-95 ${
                        meal.logged
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110'
                      }`}
                    >
                      {meal.logged ? <><Check className="h-3.5 w-3.5" /> Logged</> : 'Log Meal'}
                    </button>
                  </div>
                </div>

                {/* ── body: 68% ingredients | 32% summary ── */}
                <div className="flex min-w-0 divide-x divide-white/[0.05]">

                  {/* ingredients — 68% */}
                  <div className="min-w-0 flex-[17] px-4 py-3 space-y-2">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Ingredients</p>
                    <div className="space-y-1">
                      {meal.foods.map((food, fi) => (
                        <div key={fi} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.04] bg-black/20 px-3 py-1.5">
                          <span className="min-w-0 truncate text-[11px] font-semibold text-slate-200">
                            {food.name} <span className="text-slate-500">({food.amount})</span>
                          </span>
                          <span className="ml-2 shrink-0 whitespace-nowrap text-[10px] font-bold text-slate-400">
                            {food.calories} kcal · <span className="text-blue-400">{food.protein}g P</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* summary — 32% */}
                  <div className="flex-[8] flex flex-col justify-center gap-1.5 px-3 py-3">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500">Summary</p>
                    {/* calories */}
                    <div className="flex min-h-[28px] items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5">
                      <span className="text-[9px] font-bold uppercase text-slate-500">kcal</span>
                      <span className="text-xs font-black text-white">{meal.totalCalories}</span>
                    </div>
                    {/* protein */}
                    <div className="flex min-h-[28px] items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5">
                      <span className="text-[9px] font-bold uppercase text-blue-400">Protein</span>
                      <span className="text-xs font-black text-blue-300">{meal.totalProtein}g</span>
                    </div>
                    {/* carbs */}
                    <div className="flex min-h-[28px] items-center justify-between rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5">
                      <span className="text-[9px] font-bold uppercase text-violet-400">Carbs</span>
                      <span className="text-xs font-black text-violet-300">{meal.totalCarbs}g</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredMeals.length === 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 py-10 text-center text-sm text-slate-500">
                No meals match this filter.
              </div>
            )}
          </div>
        </div>

        {/* ── SIDEBAR (sticky) ─────────────────────────────── */}
        <div className="space-y-4 lg:sticky lg:top-4">

          {/* Recommended Stack */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Recommended Stack</h3>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Targeted Performance</p>
              </div>
            </div>

            <div className="space-y-2">
              {dietPlan.supplements.map((supp, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedSupp(supp)}
                  className="group w-full rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3 text-left transition hover:border-amber-500/30 hover:bg-amber-500/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-xs font-bold leading-snug text-white transition-colors group-hover:text-amber-300">{supp.name}</p>
                      <p className="mt-0.5 break-words text-[10px] leading-snug text-slate-500">{supp.dosage} · {supp.timing}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Micronutrients */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Daily Micronutrients</h3>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Essential Minerals</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Vit D3',    val: dietPlan.micronutrients?.vitaminD  },
                { label: 'Magnesium', val: dietPlan.micronutrients?.magnesium },
                { label: 'Zinc',      val: dietPlan.micronutrients?.zinc      },
                { label: 'Omega 3',   val: dietPlan.micronutrients?.omega3    },
              ].map((m, i) => (
                <div key={i} className="flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-white/[0.02] px-2 py-3 text-center transition hover:bg-white/[0.04]">
                  <p className="text-sm font-black text-white">{m.val}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-500">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ SUPPLEMENT MODAL ════════════════════════════════════ */}
      <AnimatePresence>
        {selectedSupp && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/65"
            onClick={() => setSelectedSupp(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            >
              <button
                onClick={() => setSelectedSupp(null)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <h3 className="mb-4 pr-8 text-xl font-black tracking-tight text-white">{selectedSupp.name}</h3>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Dosage &amp; Timing</p>
                  <p className="text-sm font-bold text-white">{selectedSupp.dosage} — {selectedSupp.timing}</p>
                </div>
                <div>
                  <p className="mb-1 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">Key Benefits</p>
                  <p className="text-sm font-medium leading-relaxed text-slate-300">{selectedSupp.benefits}</p>
                </div>
                {selectedSupp.safetyWarning && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5">
                    <p className="mb-0.5 text-xs font-bold text-rose-300">Safety Guidance</p>
                    <p className="text-xs leading-relaxed text-rose-200/80">{selectedSupp.safetyWarning}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedSupp(null)}
                className="mt-5 w-full rounded-xl bg-white py-2.5 text-xs font-extrabold uppercase tracking-widest text-black shadow transition hover:bg-slate-100"
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
