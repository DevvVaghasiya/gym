import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { generateAIDietPlan, regenerateMealInPlan, recalculateSkippedMealMacros } from '../engine/dietGenerator';
import { fetchDailyStats, saveDailyStats } from '../lib/api';
import type { SupplementRecommendation } from '../types/nutrition';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, RotateCw, AlertTriangle, CheckCircle, Droplet, Plus, Info, 
  Sparkles, Zap, ChevronRight, ShieldCheck, Activity, Coffee, Flame, Check, RefreshCw
} from 'lucide-react';

export default function NutritionPage() {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const token = useAuthStore(state => state.token);
  const dietPlan = useNutritionStore(state => state.currentPlan);
  const setDietPlan = useNutritionStore(state => state.setPlan);
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const [toastMsg, setToastMsg] = useState('');
  const [selectedSupp, setSelectedSupp] = useState<SupplementRecommendation | null>(null);
  const [todayWaterIntake, setTodayWaterIntake] = useState<number>(() => {
    const saved = localStorage.getItem(`fitai_water_${todayDateStr}`);
    return saved !== null ? parseFloat(saved) || 0 : 0;
  });
  const [mealFilter, setMealFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    if (profile && !dietPlan) {
      setDietPlan(generateAIDietPlan(profile));
    }
  }, [profile, dietPlan]);

  useEffect(() => {
    if (!profile) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const savedLocal = localStorage.getItem(`fitai_water_${todayStr}`);
    if (savedLocal !== null) {
      setTodayWaterIntake(parseFloat(savedLocal) || 0);
    }

    const loadTodayStats = async () => {
      try {
        const stats = await fetchDailyStats(token, todayStr);
        if (typeof stats.waterIntakeLiters === 'number' && stats.waterIntakeLiters > 0) {
          setTodayWaterIntake(stats.waterIntakeLiters);
          localStorage.setItem(`fitai_water_${todayStr}`, stats.waterIntakeLiters.toString());
        }
      } catch (error) {
        console.warn('Failed to load hydration state:', error);
      }
    };

    loadTodayStats();
  }, [profile, token]);

  const handleRegenerate = (mealId: string) => {
    if (!dietPlan || !profile) return;
    const preference = profile.foodPreference || 'vegetarian';
    const updated = regenerateMealInPlan(dietPlan, mealId, preference);
    setDietPlan(updated);
    showToast("Meal regenerated with fresh healthy options!");
  };

  const handleSkipMeal = (mealId: string) => {
    if (!dietPlan) return;
    const updated = recalculateSkippedMealMacros(dietPlan, mealId);
    setDietPlan(updated);
    showToast("Meal skipped. Remaining macros redistributed to upcoming meals.");
  };

  const toggleMealLogged = async (mealId: string) => {
    if (!dietPlan) return;
    const updated = {
      ...dietPlan,
      meals: dietPlan.meals.map(m => {
        if (m.id === mealId) {
          const nextLogged = !m.logged;
          if (nextLogged) {
            updateProfile({ xp: (profile?.xp || 0) + 30 });
          }
          return { ...m, logged: nextLogged, skipped: false };
        }
        return m;
      })
    };
    setDietPlan(updated);

    try {
      await saveDailyStats({
        date: new Date().toISOString().slice(0, 10),
        waterIntakeLiters: todayWaterIntake,
        meals: updated.meals.map((meal) => ({
          id: meal.id,
          time: meal.time,
          name: meal.name,
          logged: !!meal.logged,
          skipped: !!meal.skipped,
        })),
      }, token);
    } catch (error) {
      console.warn('Failed to persist meal intake:', error);
    }

    showToast("Meal status updated successfully!");
  };

  const handleAddWater = async (amountLiters: number) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const updated = Math.min(6, +(todayWaterIntake + amountLiters).toFixed(2));
    setTodayWaterIntake(updated);
    localStorage.setItem(`fitai_water_${todayStr}`, updated.toString());
    showToast(`Hydration updated: +${(amountLiters * 1000).toFixed(0)}ml logged!`);

    try {
      await saveDailyStats({
        date: todayStr,
        waterIntakeLiters: updated,
        meals: (dietPlan?.meals || []).map((meal) => ({
          id: meal.id,
          time: meal.time,
          name: meal.name,
          logged: !!meal.logged,
          skipped: !!meal.skipped,
        })),
      }, token);
    } catch (error) {
      console.warn('Failed to persist water intake:', error);
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  if (!profile) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold text-white mb-2">Profile Setup Required</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-6">Complete your profile to generate your customized AI nutrition & meal architecture.</p>
      </div>
    );
  }

  if (!dietPlan) return <div className="text-white text-center p-12">Building your personalized diet plan...</div>;

  // Calculate totals logged vs targets
  const totalCals = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalCalories : sum, 0);
  const totalP = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalProtein : sum, 0);
  const totalC = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalCarbs : sum, 0);
  const totalF = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalFat : sum, 0);

  const calPercent = Math.min(100, Math.round((totalCals / dietPlan.dailyCalories) * 100));
  const proPercent = Math.min(100, Math.round((totalP / dietPlan.protein) * 100));
  const carbPercent = Math.min(100, Math.round((totalC / dietPlan.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((totalF / dietPlan.fat) * 100));

  const waterTarget = profile.dailyWaterIntakeLiters || 3.0;
  const waterPercent = Math.min(100, Math.round((todayWaterIntake / waterTarget) * 100));

  const filteredMeals = dietPlan.meals.filter(m => {
    if (mealFilter === 'pending') return !m.logged;
    if (mealFilter === 'completed') return m.logged;
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-7xl mx-auto pb-24 space-y-8"
    >
      {/* Toast Banner */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 border border-cyan-500/40 text-cyan-300 px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-3 backdrop-blur-xl"
          >
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/50 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.2rem] border border-white/10 shadow-2xl">
        <div>
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" />
            Adaptive Nutrition Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">Diet & Nutrition Plan</h1>
          <p className="text-gray-400 text-xs sm:text-sm font-medium mt-1">Metabolic target: <span className="text-white font-bold">{dietPlan.dailyCalories} kcal/day</span> tailored for {profile.goal || 'fitness'}.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setDietPlan(generateAIDietPlan(profile))}
            className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Menu
          </button>
        </div>
      </header>

      {/* Water & Hydration Tracker Bar */}
      <div className="glass-card p-6 sm:p-8 rounded-[2rem] bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-cyan-950/40 border border-blue-500/20 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
              <Droplet className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Daily Hydration Log</h3>
                <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{waterPercent}% Goal</span>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Logged <span className="text-cyan-300 font-bold">{todayWaterIntake.toFixed(2)}L</span> / Target {waterTarget.toFixed(1)}L
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleAddWater(0.25)}
              className="px-3.5 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-cyan-300 hover:bg-blue-500/30 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> 250 ml
            </button>
            <button
              onClick={() => handleAddWater(0.5)}
              className="px-3.5 py-2 rounded-xl bg-blue-500/25 border border-blue-500/40 text-cyan-200 hover:bg-blue-500/40 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-lg"
            >
              <Plus className="w-3.5 h-3.5" /> 500 ml
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${waterPercent}%` }}
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)]"
          />
        </div>
      </div>

      {/* Progress Cards: Calories & Macros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {[
          { label: 'Calories', current: totalCals, target: dietPlan.dailyCalories, unit: 'kcal', color: 'from-amber-500 to-orange-500', pct: calPercent, icon: Flame },
          { label: 'Protein', current: totalP, target: dietPlan.protein, unit: 'g', color: 'from-blue-500 to-indigo-500', pct: proPercent, icon: Activity },
          { label: 'Carbohydrates', current: totalC, target: dietPlan.carbs, unit: 'g', color: 'from-purple-500 to-pink-500', pct: carbPercent, icon: Utensils },
          { label: 'Healthy Fats', current: totalF, target: dietPlan.fat, unit: 'g', color: 'from-rose-500 to-pink-500', pct: fatPercent, icon: Coffee },
        ].map((g, i) => (
          <div key={i} className="stat-card !p-5 !bg-slate-900/60 !border-white/10 shadow-xl rounded-2xl hover:!bg-slate-900/90 transition-all">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-widest block">{g.label}</span>
                <div className="text-white font-black text-2xl mt-0.5">
                  {g.current} <span className="text-gray-500 text-xs font-semibold">/ {g.target}{g.unit}</span>
                </div>
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-300">
                <g.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${g.pct}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${g.color}`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-gray-500">{g.target - g.current > 0 ? `${g.target - g.current}${g.unit} remaining` : 'Target reached!'}</span>
              <span className={g.pct >= 100 ? 'text-emerald-400' : 'text-gray-400'}>{g.pct}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Meals & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Meals Section */}
        <div className="lg:col-span-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
              <h2 className="text-white text-lg font-black tracking-tight">Today's Meals</h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-white/10 rounded-xl text-xs font-bold">
              <button
                onClick={() => setMealFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${mealFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                All Meals ({dietPlan.meals.length})
              </button>
              <button
                onClick={() => setMealFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${mealFilter === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Pending ({dietPlan.meals.filter(m => !m.logged).length})
              </button>
              <button
                onClick={() => setMealFilter('completed')}
                className={`px-3 py-1.5 rounded-lg transition-all ${mealFilter === 'completed' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Completed ({dietPlan.meals.filter(m => m.logged).length})
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {filteredMeals.map((meal) => (
              <div 
                key={meal.id} 
                className={`stat-card !p-6 !bg-slate-900/60 border-white/10 hover:!border-white/20 transition-all rounded-[2rem] overflow-hidden ${
                  meal.logged ? 'border-emerald-500/30 bg-emerald-950/10' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      meal.logged
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white/5 text-gray-400 border border-white/10'
                    }`}>
                      {meal.logged ? <CheckCircle className="w-6 h-6" /> : <Utensils className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">{meal.time}</span>
                        {meal.skipped && <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">Skipped</span>}
                      </div>
                      <h3 className="text-xl font-extrabold text-white tracking-tight">{meal.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleRegenerate(meal.id)}
                      title="Regenerate alternative meal"
                      className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleSkipMeal(meal.id)}
                      title="Skip meal and rebalance macros"
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-400 hover:text-rose-400 transition-all"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => toggleMealLogged(meal.id)}
                      className={`px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-1.5 ${
                        meal.logged 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:brightness-110'
                      }`}
                    >
                      {meal.logged ? <><Check className="w-4 h-4" /> Logged</> : 'Log Meal'}
                    </button>
                  </div>
                </div>

                {/* Ingredients & Macro Chip Breakdown */}
                <div className="pt-5 grid grid-cols-1 md:grid-cols-12 gap-5">
                  <div className="md:col-span-7 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block mb-2">Ingredients</span>
                    <div className="space-y-2">
                      {meal.foods.map((food, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5 text-xs">
                          <span className="text-gray-200 font-semibold">
                            {food.name} <span className="text-gray-500 text-[11px]">({food.amount})</span>
                          </span>
                          <span className="text-gray-400 font-bold text-[11px]">
                            {food.calories} kcal • <span className="text-blue-400">{food.protein}g P</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-5 bg-slate-950/80 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block mb-3 text-center">Meal Summary</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                        <span className="text-xs font-black text-white block">{meal.totalCalories}</span>
                        <span className="text-[9px] text-gray-500 uppercase font-bold">Calories</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <span className="text-xs font-black text-blue-300 block">{meal.totalProtein}g</span>
                        <span className="text-[9px] text-blue-400 uppercase font-bold">Protein</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <span className="text-xs font-black text-purple-300 block">{meal.totalCarbs}g</span>
                        <span className="text-[9px] text-purple-400 uppercase font-bold">Carbs</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: Stack & Micronutrients */}
        <div className="lg:col-span-4 space-y-6">
          {/* Supplement Stack */}
          <div className="stat-card !p-6 !bg-slate-900/60 border-white/10 rounded-[2rem] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Recommended Stack</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Targeted Performance</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {dietPlan.supplements.map((supp, i) => (
                <button
                  key={i} onClick={() => setSelectedSupp(supp)}
                  className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-white font-bold text-xs group-hover:text-amber-300 transition-colors">{supp.name}</p>
                    <p className="text-gray-500 text-[10px] font-medium mt-0.5">{supp.dosage} • {supp.timing}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Micronutrients Grid */}
          <div className="stat-card !p-6 !bg-slate-900/60 border-white/10 rounded-[2rem] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Daily Micronutrients</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Essential Minerals</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Vit D3', val: dietPlan.micronutrients?.vitaminD },
                { label: 'Magnesium', val: dietPlan.micronutrients?.magnesium },
                { label: 'Zinc', val: dietPlan.micronutrients?.zinc },
                { label: 'Omega 3', val: dietPlan.micronutrients?.omega3 },
              ].map((m, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                  <span className="text-white font-black text-xs block">{m.val}</span>
                  <span className="text-gray-500 text-[9px] font-extrabold uppercase tracking-wider">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Supplement Detail Modal */}
      <AnimatePresence>
        {selectedSupp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-[2rem] p-7 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <h3 className="text-2xl font-black text-white tracking-tight mb-4">{selectedSupp.name}</h3>
              <div className="space-y-4 text-xs mb-6">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-widest block mb-1">Dosage & Timing</span>
                  <span className="text-white font-bold">{selectedSupp.dosage} — {selectedSupp.timing}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-widest block mb-1">Key Benefits</span>
                  <p className="text-gray-300 font-medium leading-relaxed">{selectedSupp.benefits}</p>
                </div>
                {selectedSupp.safetyWarning && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                    <span className="font-bold block mb-0.5 text-[11px]">Safety Guidance:</span>
                    <p className="text-[11px] leading-relaxed">{selectedSupp.safetyWarning}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedSupp(null)}
                className="w-full py-3 rounded-xl bg-white text-black font-extrabold text-xs uppercase tracking-widest shadow-lg hover:bg-gray-100 transition-colors"
              >
                Close Window
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
