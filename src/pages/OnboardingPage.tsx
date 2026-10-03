import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { generateWorkoutPlan } from '../engine/workoutGenerator';
import { generateAIDietPlan } from '../engine/dietGenerator';
import { calculateBMI, calculateBMR, calculateTDEE, performAdvancedDiagnostics, calculateAllMetrics } from '../engine/bodyComposition';
import { buildRecommendation } from '../engine/recommendationEngine';
import { fetchMlRecommendation, saveOnboardingResult, saveProgressEntry, saveUserProfile } from '../lib/api';
import { useNutritionStore } from '../store/useNutritionStore';
import { useProgressStore } from '../store/useProgressStore';
import { useAuthStore } from '../store/useAuthStore';
import type { UserProfile, Goal, Gender, GymType, ActivityLevel, FoodPreference, Equipment, MuscleRatings } from '../types/user';
import { 
  Dumbbell, ArrowRight, ChevronLeft, Activity, User, Heart, ShieldAlert, Sparkles, 
  Smile, Flame, Droplet, Clock, Coffee, ShieldCheck, MapPin, DollarSign, AlertTriangle, Play, Zap
} from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<any>(null);
  
  const setProfile = useUserStore(state => state.setProfile);
  const setPlan = useWorkoutStore(state => state.setPlan);
  const setDietPlan = useNutritionStore(state => state.setPlan);
  const token = useAuthStore(state => state.token);
  const navigate = useNavigate();

  const weekDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const { register, handleSubmit, watch, setValue } = useForm<UserProfile>({
    defaultValues: {
      name: '',
      phone: '',
      selectedWorkoutDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      age: 26,
      gender: 'male',
      heightCm: 178,
      weightKg: 74,
      goalWeightKg: 70,
      bodyFatPercent: 16,
      muscleMassPercent: 40,
      waterPercent: 60,
      experience: 'beginner',
      goal: 'recomposition',
      daysPerWeek: 4,
      workoutDuration: 60,
      gymType: 'commercial',
      availableEquipment: ['dumbbell', 'barbell', 'cable', 'machine', 'bodyweight'],
      injuries: [],
      mobilityIssues: [],
      previousSurgeries: [],
      activityLevel: 'moderate',
      occupation: 'Office Worker',
      jobType: 'sitting',
      dailySteps: 6000,
      sleepHours: 7,
      stressLevel: 'medium',
      dailyWaterIntakeLiters: 2.5,
      muscleRatings: { chest: 5, back: 5, shoulders: 5, arms: 5, legs: 5, core: 5 },
      cuisinePreference: 'indian',
      smokingHabit: false,
      alcoholConsumption: 'none',
      country: 'India',
      foodPreference: 'vegetarian',
      dailyFoodBudget: 300,
      numberOfMeals: 3,
      allergies: [],
      favoriteFoods: [],
      dislikedFoods: [],
      workoutTime: '07:00',
      wakeupTime: '06:30',
      sleepTime: '22:30',
      xp: 100,
      level: 1,
      badges: [],
      streak: 1
    }
  });

  // Watch key values for on-the-fly calculations
  const weight = watch('weightKg');
  const height = watch('heightCm');
  const age = watch('age');
  const gender = watch('gender');
  const activityLevel = watch('activityLevel');
  const goal = watch('goal');
  const selectedEquipment = watch('availableEquipment') || [];
  const selectedWorkoutDays = watch('selectedWorkoutDays') || [];

  const syncWorkoutDaySelection = (nextDays: number) => {
    const current = [...(watch('selectedWorkoutDays') || [])].filter((day) => weekDayOrder.includes(day));
    const fallbackSelection = [...new Set([...current, ...weekDayOrder])].filter((day) => weekDayOrder.includes(day));
    const nextSelection = fallbackSelection.slice(0, nextDays);
    setValue('daysPerWeek', nextDays);
    setValue('selectedWorkoutDays', nextSelection.length > 0 ? nextSelection : weekDayOrder.slice(0, nextDays));
  };

  const toggleWorkoutDay = (day: string) => {
    const current = [...(watch('selectedWorkoutDays') || [])].filter((item) => weekDayOrder.includes(item));
    const exists = current.includes(day);

    if (exists) {
      const nextSelection = current.filter((item) => item !== day);
      setValue('selectedWorkoutDays', nextSelection);
      setValue('daysPerWeek', Math.max(1, nextSelection.length));
      return;
    }

    const nextSelection = [...current, day].sort((a, b) => weekDayOrder.indexOf(a) - weekDayOrder.indexOf(b));
    setValue('selectedWorkoutDays', nextSelection);
    setValue('daysPerWeek', nextSelection.length);
  };

  const [liveMetrics, setLiveMetrics] = useState({ bmi: 23, bmr: 1700, tdee: 2300 });

  useEffect(() => {
    const w = Number(weight) || 70;
    const h = Number(height) || 175;
    const a = Number(age) || 25;
    const bmiVal = calculateBMI(w, h);
    const bmrVal = calculateBMR(w, h, a, gender);
    const tdeeVal = calculateTDEE(bmrVal, activityLevel);
    setLiveMetrics({
      bmi: Math.round(bmiVal * 10) / 10,
      bmr: Math.round(bmrVal),
      tdee: Math.round(tdeeVal)
    });
  }, [weight, height, age, gender, activityLevel]);

  const toggleEquipment = (eq: Equipment) => {
    const current = [...selectedEquipment];
    const idx = current.indexOf(eq);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(eq);
    }
    setValue('availableEquipment', current);
  };

  const onSubmit = async (data: UserProfile) => {
    // Process form values
    data.age = Number(data.age);
    data.weightKg = Number(data.weightKg);
    data.heightCm = Number(data.heightCm);
    data.goalWeightKg = Number(data.goalWeightKg);
    data.bodyFatPercent = Number(data.bodyFatPercent);
    data.muscleMassPercent = Number(data.muscleMassPercent || 0);
    data.waterPercent = Number(data.waterPercent || 0);
    data.sleepHours = Number(data.sleepHours);
    data.dailyFoodBudget = Number(data.dailyFoodBudget);
    data.numberOfMeals = Number(data.numberOfMeals);
    
    // Auto calculations
    data.bmi = liveMetrics.bmi;
    data.bmr = liveMetrics.bmr;
    data.tdee = liveMetrics.tdee;
    data.dailyWaterIntakeLiters = calculateAllMetrics(data).waterIntakeLiters;

    // Trigger AI analysis loading screen
    setIsAnalyzing(true);
    
    // Simulate analyzing process updates
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAnalysisProgress(i);
    }

    const diagnostics = performAdvancedDiagnostics(data);
    let rec = buildRecommendation(data);
    try {
      const ml = await fetchMlRecommendation(data);
      if (ml?.strategy && ml?.split) rec = { ...rec, ...ml, source: 'ml' };
    } catch {
      /* local rule engine is the fallback */
    }
    data.recommendedStrategy = rec.strategy;
    data.recommendedSplit = rec.split;
    data.tdee = rec.tdee;
    data.bmr = rec.bmr;
    setDiagnosticReport({
      ...diagnostics,
      profile: data,
      recommendation: rec,
    });

    setIsAnalyzing(false);
    setShowReport(true);
  };

  const confirmAndProceedToDashboard = async () => {
    if (!diagnosticReport) return;
    
    const finalProfile = diagnosticReport.profile;
    const recommendation = diagnosticReport.recommendation ?? buildRecommendation(finalProfile);
    const profileToSave = {
      ...finalProfile,
      recommendedStrategy: recommendation.strategy,
      recommendedSplit: recommendation.split,
      dailyCalories: recommendation.calories,
      proteinTarget: recommendation.protein,
      carbsTarget: recommendation.carbs,
      fatTarget: recommendation.fat,
      bmr: recommendation.bmr,
      tdee: recommendation.tdee,
    };

    const baselineEntry = {
      date: new Date().toISOString().slice(0, 10),
      weightKg: finalProfile.weightKg,
      bodyFatPercent: finalProfile.bodyFatPercent,
      muscleMassPercent: finalProfile.muscleMassPercent,
      notes: 'Onboarding baseline',
    };

    const plan = generateWorkoutPlan(profileToSave);
    const dietPlan = generateAIDietPlan(profileToSave);

    const onboardingPayload = {
      ...profileToSave,
      recommendedStrategy: recommendation.strategy,
      recommendedSplit: recommendation.split,
      dailyCalories: recommendation.calories,
      proteinTarget: recommendation.protein,
      carbsTarget: recommendation.carbs,
      fatTarget: recommendation.fat,
      workoutPlan: plan,
      dietPlan,
    };

    setProfile(profileToSave);
    setPlan(plan);
    setDietPlan(dietPlan);
    useProgressStore.getState().addEntry(baselineEntry);

    try {
      await saveUserProfile(profileToSave, token);
    } catch {
      // Keep the profile local if the backend is unavailable.
    }

    try {
      await saveOnboardingResult(onboardingPayload, token);
    } catch {
      // Keep the onboarding result local if the API is unavailable.
    }

    try {
      await saveProgressEntry(baselineEntry, token);
    } catch {
      // Keep the baseline local if the API is unavailable.
    }

    navigate('/');
  };

  const stepTitle = () => {
    switch (step) {
      case 1: return "Basic Profile Information";
      case 2: return "Biometrics & Body Composition";
      case 3: return "Fitness Goals & Gym Setup";
      case 4: return "Injuries & Mobility Safety";
      case 5: return "Daily Habits & Lifestyle";
      case 6: return "Nutrition Preference & Budget";
      case 7: return "Daily Routine & Timings";
      default: return "Onboarding";
    }
  };

  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-[1.2rem] px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-300 text-sm font-bold";
  const labelClasses = "block text-[10px] font-extrabold text-gray-500 mb-2 ml-1 uppercase tracking-widest";

  const goalOptions: { value: Goal; title: string; desc: string; icon: any }[] = [
    { value: 'muscle_gain', title: 'Build Muscle', desc: 'Hypertrophy focused', icon: Dumbbell },
    { value: 'fat_loss', title: 'Fat Loss', desc: 'Caloric deficit', icon: Flame },
    { value: 'strength', title: 'Strength', desc: 'Performance focus', icon: Zap },
    { value: 'recomposition', title: 'Recomp', desc: 'Muscle + Loss', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tr from-purple-600/10 via-pink-600/5 to-transparent rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_30%)]" />

      {isAnalyzing ? (
        // AI Loading Processing Screen
        <div className="w-full max-w-md backdrop-blur-3xl bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-10 text-center relative shadow-[0_30px_80px_-40px_rgba(59,130,246,0.8)] ring-1 ring-white/5">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full mx-auto mb-8"
          />
          <h2 className="text-2xl font-black text-white mb-2 tracking-tight">AI Analysis in Progress</h2>
          <p className="text-gray-500 font-medium mb-10">We're calculating your metabolic rate and adaptive training volume.</p>
          
          <div className="space-y-4 text-left">
            {[
              "Calculating BMR & Somatotype",
              "Evaluating Muscular Imbalances",
              "Determining Recovery Capacity",
              "Structuring Macro Partitioning",
              "Generating Adaptive Routine"
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-4 text-sm">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${analysisProgress > idx ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/10 text-gray-700'}`}>
                  {analysisProgress > idx ? "✓" : ""}
                </div>
                <span className={analysisProgress > idx ? "text-white font-bold" : "text-gray-600 font-medium"}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : showReport ? (
        // AI DIAGNOSTIC REPORT
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-3xl backdrop-blur-3xl bg-slate-900/40 border border-white/10 rounded-[3rem] p-12 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.8)] ring-1 ring-white/5 relative"
        >
          <div className="flex items-center justify-between mb-12">
            <div>
              <p className="text-blue-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Physiology Diagnostic</p>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">Your AI Blueprint</h2>
            </div>
            <div className="w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Sparkles className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="stat-card">
              <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Strategy</p>
              <h4 className="text-2xl font-black text-white mb-2">{diagnosticReport.recommendation?.strategyLabel}</h4>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">{diagnosticReport.recommendation?.strategyReason}</p>
            </div>
            <div className="stat-card">
              <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Metabolism</p>
              <h4 className="text-2xl font-black text-white mb-2">{diagnosticReport.recommendation?.calories} kcal</h4>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">P: {diagnosticReport.recommendation?.protein}g · C: {diagnosticReport.recommendation?.carbs}g · F: {diagnosticReport.recommendation?.fat}g</p>
            </div>
            <div className="stat-card">
              <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Split</p>
              <h4 className="text-2xl font-black text-white mb-2">{diagnosticReport.recommendation?.splitLabel}</h4>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">{diagnosticReport.recommendation?.splitReason}</p>
            </div>
            <div className="stat-card">
              <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Est. Timeline</p>
              <h4 className="text-2xl font-black text-white mb-2">{diagnosticReport.timelineWeeks} Weeks</h4>
              <p className="text-gray-500 text-xs font-medium leading-relaxed">To reach target weight of {diagnosticReport.profile.goalWeightKg}kg.</p>
            </div>
          </div>

          <button
            onClick={confirmAndProceedToDashboard}
            className="w-full py-5 rounded-[2rem] bg-white text-black font-extrabold text-lg shadow-2xl hover:bg-gray-100 active:scale-95 transition-all"
          >
            Activate My Plan
          </button>
        </motion.div>
      ) : (
        // FORM WIZARD
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl relative z-10"
        >
          <div className="backdrop-blur-3xl bg-slate-900/40 border border-white/10 rounded-[3rem] p-12 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.8)] ring-1 ring-white/5">
            <header className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest">Step {step} of 7</span>
                <div className="flex gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className={`h-1 w-8 rounded-full transition-colors ${i + 1 <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>
              <h2 className="text-4xl font-extrabold text-white tracking-tight">{stepTitle()}</h2>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1" 
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Full Name</label>
                        <input {...register("name")} required className={inputClasses} placeholder="John Doe" />
                      </div>
                      <div>
                        <label className={labelClasses}>Gender</label>
                        <select {...register("gender")} className={inputClasses}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Age</label>
                      <input {...register("age")} type="number" required className={inputClasses} placeholder="25" />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Height (cm)</label>
                        <input {...register("heightCm")} type="number" required className={inputClasses} placeholder="178" />
                      </div>
                      <div>
                        <label className={labelClasses}>Weight (kg)</label>
                        <input {...register("weightKg")} type="number" step="0.1" required className={inputClasses} placeholder="74" />
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Goal Weight (kg)</label>
                      <input {...register("goalWeightKg")} type="number" step="0.1" required className={inputClasses} placeholder="70" />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div>
                      <label className={labelClasses}>Your Main Goal</label>
                      <div className="grid grid-cols-2 gap-4">
                        {goalOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setValue('goal', opt.value)}
                            className={`p-6 rounded-3xl border text-left transition-all ${
                              watch('goal') === opt.value
                                ? 'bg-blue-500/10 border-blue-500 shadow-xl shadow-blue-500/10'
                                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
                            }`}
                          >
                            <opt.icon className={`w-6 h-6 mb-4 ${watch('goal') === opt.value ? 'text-blue-500' : 'text-gray-500'}`} />
                            <div className="text-white font-bold text-sm mb-1">{opt.title}</div>
                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Days Per Week</label>
                      <div className="flex gap-3">
                        {[2, 3, 4, 5, 6].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => syncWorkoutDaySelection(d)}
                            className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                              watch('daysPerWeek') === d ? 'bg-white text-black' : 'bg-white/[0.03] text-gray-500'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Choose Your Training Days</label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {weekDayOrder.map((day) => {
                          const isSelected = (selectedWorkoutDays || []).includes(day);

                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleWorkoutDay(day)}
                              className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-all ${
                                isSelected
                                  ? 'border-blue-500/40 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10'
                                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.05] hover:text-white'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step > 3 && (
                  <motion.div 
                    key={`step${step}`}
                    initial={{ opacity: 0, x: 20 }} 
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center py-10"
                  >
                    <p className="text-gray-500 font-medium italic">Simulating remaining onboarding steps for demonstration...</p>
                    <p className="text-white font-bold mt-4">We've gathered enough base data to build your profile.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4 pt-10 border-t border-white/5">
                {step > 1 && (
                  <button 
                    type="button" onClick={() => setStep(step - 1)}
                    className="flex-1 py-4 rounded-2xl bg-white/[0.03] text-white font-bold text-sm hover:bg-white/[0.05] transition-all"
                  >
                    Back
                  </button>
                )}
                
                {step < 3 ? (
                  <button 
                    type="button" onClick={() => setStep(step + 1)}
                    className="flex-[2] py-4 rounded-2xl bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    Continue
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="flex-[2] py-4 rounded-2xl bg-white text-black font-extrabold text-sm shadow-2xl hover:scale-105 active:scale-95 transition-all"
                  >
                    Generate My AI Plan
                  </button>
                )}
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
}
