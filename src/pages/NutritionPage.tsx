import { useState, useEffect } from 'react';
import { useUserStore } from '../store/useUserStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { generateAIDietPlan, regenerateMealInPlan, recalculateSkippedMealMacros } from '../engine/dietGenerator';
import type { NutritionPlan, Meal, SupplementRecommendation } from '../types/nutrition';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Utensils, RotateCw, AlertTriangle, CheckCircle, Droplet, Plus, Info, 
  HelpCircle, Coffee, ShieldAlert, Sparkles, Zap, ChevronRight, ShieldCheck, Activity
} from 'lucide-react';

export default function NutritionPage() {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const dietPlan = useNutritionStore(state => state.currentPlan);
  const setDietPlan = useNutritionStore(state => state.setPlan);
  const [logMessage, setLogMessage] = useState('');
  const [selectedSupp, setSelectedSupp] = useState<SupplementRecommendation | null>(null);

  useEffect(() => {
    if (profile && !dietPlan) {
      setDietPlan(generateAIDietPlan(profile));
    }
  }, [profile, dietPlan]);

  const handleRegenerate = (mealId: string) => {
    if (!dietPlan || !profile) return;
    const preference = profile.foodPreference || 'vegetarian';
    const updated = regenerateMealInPlan(dietPlan, mealId, preference);
    setDietPlan(updated);
    showFeedback("Meal regenerated!");
  };

  const handleSkipMeal = (mealId: string) => {
    if (!dietPlan) return;
    const updated = recalculateSkippedMealMacros(dietPlan, mealId);
    setDietPlan(updated);
    showFeedback("Meal skipped. Remaining calories and macros distributed to upcoming meals.");
  };

  const toggleMealLogged = (mealId: string) => {
    if (!dietPlan) return;
    const updated = {
      ...dietPlan,
      meals: dietPlan.meals.map(m => {
        if (m.id === mealId) {
          const nextLogged = !m.logged;
          if (nextLogged) {
            updateProfile({ xp: (profile?.xp || 0) + 30 }); // reward meal logging
          }
          return { ...m, logged: nextLogged, skipped: false };
        }
        return m;
      })
    };
    setDietPlan(updated);
    showFeedback("Meal logging updated!");
  };

  const showFeedback = (msg: string) => {
    setLogMessage(msg);
    setTimeout(() => setLogMessage(''), 4000);
  };

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <AlertTriangle className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Diagnostic Required</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-6">Complete onboarding to configure your physiological macronutrient needs.</p>
      </div>
    );
  }

  if (!dietPlan) return <div className="text-white text-center p-8">Building your custom nutrition plan...</div>;

  // Calculate totals logged
  const totalCals = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalCalories : sum, 0);
  const totalP = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalProtein : sum, 0);
  const totalC = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalCarbs : sum, 0);
  const totalF = dietPlan.meals.reduce((sum, m) => m.logged ? sum + m.totalFat : sum, 0);

  const calPercent = Math.min(100, Math.round((totalCals / dietPlan.dailyCalories) * 100));
  const proPercent = Math.min(100, Math.round((totalP / dietPlan.protein) * 100));
  const carbPercent = Math.min(100, Math.round((totalC / dietPlan.carbs) * 100));
  const fatPercent = Math.min(100, Math.round((totalF / dietPlan.fat) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto pb-20 space-y-10"
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-3">Nutrition Architect</h1>
          <p className="text-gray-500 font-medium text-sm">Smart meal planning based on your metabolic rate.</p>
        </div>

        <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-2 rounded-[1.5rem] shadow-xl">
          <div className="px-5 py-2.5 rounded-[1.2rem] bg-cyan-500/10 border border-cyan-500/10 text-[11px] font-extrabold text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
            <Droplet className="w-3.5 h-3.5" />
            Target: {(profile.dailyWaterIntakeLiters || 3.0).toFixed(1)}L
          </div>
          <button className="px-6 py-2.5 rounded-[1.2rem] bg-white text-black font-extrabold text-[11px] uppercase tracking-widest shadow-lg shadow-white/5 hover:bg-gray-100 active:scale-95 transition-all">
            Recalculate Macros
          </button>
        </div>
      </header>

      {/* Progress Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Calories', current: totalCals, target: dietPlan.dailyCalories, unit: 'kcal', color: 'from-orange-500 to-amber-400', pct: calPercent },
          { label: 'Protein', current: totalP, target: dietPlan.protein, unit: 'g', color: 'from-blue-500 to-indigo-400', pct: proPercent },
          { label: 'Carbs', current: totalC, target: dietPlan.carbs, unit: 'g', color: 'from-purple-500 to-pink-400', pct: carbPercent },
          { label: 'Fats', current: totalF, target: dietPlan.fat, unit: 'g', color: 'from-pink-500 to-rose-400', pct: fatPercent },
        ].map((g, i) => (
          <div key={i} className="stat-card !bg-white/[0.03] !border-white/10 shadow-2xl hover:!bg-white/[0.04]">
            <div className="flex justify-between items-end mb-4">
              <p className="text-gray-500 text-[9px] font-extrabold uppercase tracking-[0.2em]">{g.label}</p>
              <p className="text-white font-black text-xl leading-none">
                {g.current}
                <span className="text-gray-600 text-[10px] font-bold ml-1.5 uppercase">/ {g.target}{g.unit}</span>
              </p>
            </div>
            <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden mb-2.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${g.pct}%` }}
                className={`h-full rounded-full bg-gradient-to-r ${g.color}`}
              />
            </div>
            <div className="flex justify-between items-center">
               <div className="flex gap-1">
                 {[...Array(5)].map((_, idx) => (
                   <div key={idx} className={`h-1 w-2.5 rounded-full ${idx < (g.pct / 20) ? 'bg-white/20' : 'bg-white/5'}`} />
                 ))}
               </div>
               <p className={`text-[10px] font-black tracking-tighter ${g.pct >= 100 ? 'text-emerald-500' : 'text-gray-500'}`}>{g.pct}%</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Meals */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="w-1 h-4 bg-blue-500 rounded-full" />
            <h2 className="text-gray-400 text-[11px] font-extrabold uppercase tracking-[0.25em]">Today's Menu Plan</h2>
          </div>

          <div className="space-y-6">
            {dietPlan.meals.map((meal) => (
              <div 
                key={meal.id} 
                className={`stat-card !p-0 !bg-white/[0.02] border-white/5 hover:!bg-white/[0.03] overflow-hidden transition-all duration-500 ${meal.logged ? 'opacity-50 grayscale-[0.3]' : ''}`}
              >
                <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all duration-500 shadow-2xl ${
                      meal.logged
                        ? 'bg-emerald-500/20 text-emerald-500 rotate-[360deg]'
                        : 'bg-white/[0.04] text-gray-500 border border-white/5'
                    }`}>
                      {meal.logged ? <CheckCircle className="w-7 h-7" /> : <Utensils className="w-7 h-7" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-white/5 px-2.5 py-1 rounded-lg text-gray-500 text-[9px] font-black uppercase tracking-widest border border-white/5">{meal.time}</span>
                        {meal.skipped && <span className="text-red-500 text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-red-500/10 rounded-lg">Skipped</span>}
                      </div>
                      <h3 className="text-2xl font-black text-white tracking-tight leading-none">{meal.name}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleRegenerate(meal.id)}
                      className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleMealLogged(meal.id)}
                      className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 ${
                        meal.logged 
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : 'bg-white text-black hover:bg-gray-100'
                      }`}
                    >
                      {meal.logged ? 'Completed' : 'Log Meal'}
                    </button>
                  </div>
                </div>

                <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-5 gap-10">
                  <div className="md:col-span-3 space-y-4">
                    <p className="text-gray-600 text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Ingredients
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      {meal.foods.map((food, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-black/30 border border-white/[0.05] hover:border-white/10 transition-colors">
                          <span className="text-[13px] font-bold text-white/90">
                            {food.name}
                            <span className="text-gray-500 font-semibold text-[11px] ml-2">({food.amount})</span>
                          </span>
                          <span className="text-gray-500 text-[10px] font-black tracking-widest uppercase whitespace-nowrap">
                            {food.calories} <span className="text-gray-700">kcal</span>
                            <span className="mx-2 text-gray-800">|</span>
                            <span className="text-blue-500/80">{food.protein}g P</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 bg-white/[0.02] rounded-[2.2rem] p-8 border border-white/[0.05] flex flex-col justify-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-50" />
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-center">Macro Breakdown</p>
                    <div className="space-y-6">
                      {[
                        { label: 'Protein', val: meal.totalProtein, color: 'bg-blue-500', shadow: 'shadow-blue-500/40' },
                        { label: 'Carbs', val: meal.totalCarbs, color: 'bg-purple-500', shadow: 'shadow-purple-500/40' },
                        { label: 'Fats', val: meal.totalFat, color: 'bg-pink-500', shadow: 'shadow-pink-500/40' },
                      ].map((m, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-end mb-2 px-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{m.label}</span>
                            <span className="text-xs font-black text-white">{m.val}g</span>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(m.val / (meal.totalProtein + meal.totalCarbs + meal.totalFat)) * 100}%` }}
                              className={`h-full rounded-full ${m.color} ${m.shadow} shadow-[0_0_12px_rgba(255,255,255,0.05)]`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Supplements */}
          <div className="stat-card !bg-white/[0.02] border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-yellow-500/10 transition-colors" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 shadow-inner">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">Supplements</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Optimized Stack</p>
              </div>
            </div>
            <div className="space-y-3">
              {dietPlan.supplements.map((supp, i) => (
                <button
                  key={i} onClick={() => setSelectedSupp(supp)}
                  className="w-full text-left p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/[0.02] transition-all flex items-center justify-between group/btn"
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-white font-bold text-sm truncate group-hover/btn:text-yellow-500 transition-colors">{supp.name}</p>
                    <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-1 truncate">{supp.dosage}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-700 group-hover/btn:text-white transition-all flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Micro */}
          <div className="stat-card !bg-white/[0.02] border-white/5 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
             <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">Micronutrients</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Daily Targets</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Vit D3', val: dietPlan.micronutrients?.vitaminD, icon: Coffee },
                { label: 'Mag', val: dietPlan.micronutrients?.magnesium, icon: Activity },
                { label: 'Zinc', val: dietPlan.micronutrients?.zinc, icon: ShieldCheck },
                { label: 'Omega 3', val: dietPlan.micronutrients?.omega3, icon: Droplet },
              ].map((m, i) => (
                <div key={i} className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5 hover:border-emerald-500/20 transition-all text-center">
                  <p className="text-white font-black text-sm mb-1">{m.val}</p>
                  <p className="text-gray-600 text-[9px] font-extrabold uppercase tracking-widest">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {selectedSupp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white tracking-tight mb-6">{selectedSupp.name}</h3>
              <div className="space-y-6 mb-10">
                <div>
                  <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-1">Dosage</p>
                  <p className="text-white font-bold">{selectedSupp.dosage} • {selectedSupp.timing}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-1">Benefits</p>
                  <p className="text-white font-medium text-sm leading-relaxed">{selectedSupp.benefits}</p>
                </div>
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                   <p className="text-red-500 text-[10px] font-extrabold uppercase tracking-widest mb-1 flex items-center gap-2">
                     <ShieldAlert className="w-3 h-3" /> Safety Warning
                   </p>
                   <p className="text-red-200/80 font-medium text-xs">{selectedSupp.safetyWarning}</p>
                </div>
              </div>
              <button onClick={() => setSelectedSupp(null)} className="w-full py-4 rounded-2xl bg-white text-black font-extrabold text-sm shadow-xl hover:bg-gray-100 transition-colors">
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
