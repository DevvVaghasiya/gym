import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const existingProfile = useUserStore(state => state.profile);
  const setPlan = useWorkoutStore(state => state.setPlan);
  const setDietPlan = useNutritionStore(state => state.setPlan);
  const token = useAuthStore(state => state.token);
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = (location.state as { prefill?: Partial<UserProfile> } | null)?.prefill ?? {};

  const weekDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<UserProfile>({
    defaultValues: {
      name: '',
      email: '',
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
      streak: 1,
      ...(existingProfile ?? {}),
      ...prefill,
    },
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
      if (current.length === 1) return;
      const nextSelection = current.filter((item) => item !== day);
      setValue('selectedWorkoutDays', nextSelection);
      setValue('daysPerWeek', Math.max(1, nextSelection.length));
      return;
    }

    const nextSelection = [...current, day].sort((a, b) => weekDayOrder.indexOf(a) - weekDayOrder.indexOf(b));
    setValue('selectedWorkoutDays', nextSelection);
    setValue('daysPerWeek', nextSelection.length);
  };

  const toggleListValue = (field: 'injuries' | 'mobilityIssues' | 'previousSurgeries' | 'availableEquipment', value: string) => {
    const selected = (watch(field) ?? []) as string[];
    const next = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];
    setValue(field as any, next, { shouldDirty: true });
  };

  const updateTextList = (field: 'allergies' | 'favoriteFoods' | 'dislikedFoods', value: string) => {
    setValue(field, value.split(',').map(item => item.trim()).filter(Boolean), { shouldDirty: true });
  };

  const handleContinue = async () => {
    const values = watch();
    if (step === 1) {
      const ageValue = Number(values.age);
      const isValid = Boolean(values.name?.trim()) && Number.isInteger(ageValue) && ageValue >= 13 && ageValue <= 100;
      if (!isValid) {
        await trigger(['name', 'age']);
        return;
      }
    }
    if (step === 2) {
      const heightValue = Number(values.heightCm);
      const currentWeight = Number(values.weightKg);
      const targetWeight = Number(values.goalWeightKg);
      const isValid = heightValue >= 100 && heightValue <= 250
        && currentWeight >= 30 && currentWeight <= 350
        && targetWeight >= 30 && targetWeight <= 350;
      if (!isValid) {
        await trigger(['heightCm', 'weightKg', 'goalWeightKg']);
        return;
      }
    }
    setStep(current => current + 1);
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

  const handleWizardSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step < 7) {
      void handleContinue();
      return;
    }
    void handleSubmit(onSubmit)();
  };

  const stepTitle = () => {
    switch (step) {
      case 1: return "Basic Profile Information";
      case 2: return "Biometrics & Body Composition";
      case 3: return "Fitness Goals & Gym Setup";
      case 4: return "Injuries & Mobility";
      case 5: return "Lifestyle & Recovery";
      case 6: return "Food & Nutrition";
      case 7: return "Your Weekly Routine";
      default: return "Onboarding";
    }
  };

  const stepDescription = () => {
    switch (step) {
      case 1: return 'Start with the basics. Your account details are carried over where available.';
      case 2: return 'These measurements help estimate your starting targets. You can update them later.';
      case 3: return 'Choose a goal and training setup that fits your week and available equipment.';
      case 4: return 'Share anything that should shape safer exercise suggestions. This is not a medical assessment.';
      case 5: return 'Your day-to-day activity and recovery help us set realistic training and nutrition targets.';
      case 6: return 'Tell us what you eat, your preferences, and any foods the plan should avoid.';
      case 7: return 'Set a routine that fits your normal sleep and training schedule.';
      default: return '';
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
  const trainingEquipment = [
    { value: 'barbell', label: 'Barbell' },
    { value: 'dumbbell', label: 'Dumbbells' },
    { value: 'cable', label: 'Cable' },
    { value: 'machine', label: 'Machines' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'kettlebell', label: 'Kettlebells' },
    { value: 'resistance_band', label: 'Bands' },
  ] as const;
  const safetyGroups = [
    { field: 'injuries', label: 'Current injuries or recurring pain', options: ['Shoulder', 'Knee', 'Back', 'Hip', 'Wrist or elbow', 'Ankle'] },
    { field: 'mobilityIssues', label: 'Movements you find difficult', options: ['Squatting', 'Hip hinging', 'Overhead reaching', 'Kneeling', 'Balancing'] },
    { field: 'previousSurgeries', label: 'Previous surgeries that affect exercise', options: ['Back', 'Knee', 'Shoulder', 'Hip', 'Other'] },
  ] as const;

  return (
    <div className="relative flex min-h-[100dvh] items-start justify-center overflow-x-hidden bg-[#030712] px-3 py-5 font-sans selection:bg-blue-500/30 sm:items-center sm:p-6">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tr from-purple-600/10 via-pink-600/5 to-transparent rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.08),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.08),_transparent_30%)]" />

      {isAnalyzing ? (
        // AI Loading Processing Screen
        <div className="relative w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6 text-center shadow-[0_30px_80px_-40px_rgba(59,130,246,0.8)] ring-1 ring-white/5 backdrop-blur-3xl sm:rounded-[2.5rem] sm:p-10">
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
          className="relative w-full max-w-3xl rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.8)] ring-1 ring-white/5 backdrop-blur-3xl sm:rounded-[2.5rem] sm:p-8 lg:p-10"
        >
          <div className="mb-7 flex items-center justify-between gap-4 sm:mb-10">
            <div>
              <p className="text-blue-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Physiology Diagnostic</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">Your AI Blueprint</h2>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 sm:h-16 sm:w-16 sm:rounded-[1.5rem]">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
          </div>

          <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 sm:mb-10">
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
            className="min-h-12 w-full rounded-2xl bg-white px-4 py-3 text-base font-extrabold text-black shadow-2xl transition-all hover:bg-gray-100 active:scale-[0.99] sm:rounded-[2rem] sm:py-5 sm:text-lg"
          >
            Activate My Plan
          </button>
        </motion.div>
      ) : (
        // FORM WIZARD
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 my-auto w-full max-w-2xl"
        >
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-5 shadow-[0_30px_80px_-40px_rgba(59,130,246,0.8)] ring-1 ring-white/5 backdrop-blur-3xl sm:rounded-[2.5rem] sm:p-8 lg:p-10">
            <header className="mb-7 sm:mb-10">
              <div className="mb-5 flex items-center justify-between gap-4 sm:mb-6">
                <span className="text-xs font-bold text-slate-400">Step {step} of 7</span>
                <div className="flex gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className={`h-1 w-5 rounded-full transition-colors sm:w-8 ${i + 1 <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
                  ))}
                </div>
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{stepTitle()}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">{stepDescription()}</p>
            </header>

            <form onSubmit={handleWizardSubmit} className="space-y-6 sm:space-y-8">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div 
                    key="step1" 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClasses} htmlFor="onboarding-name">Full name</label>
                        <input
                          id="onboarding-name"
                          {...register('name', { required: 'Enter your name to continue.' })}
                          autoComplete="name"
                          required
                          className={inputClasses}
                          placeholder="Your name"
                        />
                        {errors.name?.message && <p role="alert" className="mt-2 text-xs text-rose-300">{errors.name.message}</p>}
                      </div>
                      {watch('email') && (
                        <div className="sm:col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                          <p className={labelClasses}>Account email</p>
                          <p className="break-all text-sm font-semibold text-slate-200">{watch('email')}</p>
                        </div>
                      )}
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-age">Age</label>
                        <input
                          id="onboarding-age"
                          {...register('age', { valueAsNumber: true, min: { value: 13, message: 'Age must be at least 13.' }, max: { value: 100, message: 'Enter an age under 100.' } })}
                          type="number" inputMode="numeric" min="13" max="100" required
                          className={inputClasses} placeholder="25"
                        />
                        {errors.age?.message && <p role="alert" className="mt-2 text-xs text-rose-300">{errors.age.message}</p>}
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-gender">Gender used for estimates</label>
                        <select id="onboarding-gender" {...register('gender')} className={inputClasses}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className={labelClasses} htmlFor="onboarding-phone">Phone number <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                        <input id="onboarding-phone" {...register('phone')} type="tel" autoComplete="tel" className={inputClasses} placeholder="Add a contact number" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-height">Height (cm)</label>
                        <input id="onboarding-height" {...register('heightCm', { valueAsNumber: true, min: 100, max: 250 })} type="number" inputMode="decimal" min="100" max="250" required className={inputClasses} placeholder="178" />
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-weight">Current weight (kg)</label>
                        <input id="onboarding-weight" {...register('weightKg', { valueAsNumber: true, min: 30, max: 350 })} type="number" inputMode="decimal" min="30" max="350" step="0.1" required className={inputClasses} placeholder="74" />
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-goal-weight">Target weight (kg)</label>
                        <input id="onboarding-goal-weight" {...register('goalWeightKg', { valueAsNumber: true, min: 30, max: 350 })} type="number" inputMode="decimal" min="30" max="350" step="0.1" required className={inputClasses} placeholder="70" />
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-body-fat">Body fat % <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                        <input id="onboarding-body-fat" {...register('bodyFatPercent', { valueAsNumber: true })} type="number" inputMode="decimal" min="1" max="70" step="0.1" className={inputClasses} placeholder="If known" />
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-muscle-mass">Muscle mass % <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                        <input id="onboarding-muscle-mass" {...register('muscleMassPercent', { valueAsNumber: true })} type="number" inputMode="decimal" min="1" max="90" step="0.1" className={inputClasses} placeholder="If known" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-center sm:gap-3 sm:p-4">
                      {[
                        { label: 'BMI estimate', value: liveMetrics.bmi },
                        { label: 'BMR estimate', value: `${liveMetrics.bmr} kcal` },
                        { label: 'Daily burn', value: `${liveMetrics.tdee} kcal` },
                      ].map(metric => (
                        <div key={metric.label} className="min-w-0">
                          <p className="text-[9px] font-bold uppercase text-slate-500 sm:text-[10px]">{metric.label}</p>
                          <p className="mt-1 text-xs font-extrabold text-white sm:text-sm">{metric.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div 
                    key="step3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className={labelClasses}>Your Main Goal</label>
                      <div className="grid grid-cols-2 gap-3">
                        {goalOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setValue('goal', opt.value)}
                            aria-pressed={watch('goal') === opt.value}
                            className={`min-h-28 rounded-2xl border p-3 text-left transition-all sm:p-4 ${
                              watch('goal') === opt.value
                                ? 'bg-blue-500/10 border-blue-500 shadow-xl shadow-blue-500/10'
                                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
                            }`}
                          >
                            <opt.icon className={`mb-2 h-5 w-5 ${watch('goal') === opt.value ? 'text-blue-400' : 'text-gray-500'}`} />
                            <div className="mb-1 text-sm font-bold text-white">{opt.title}</div>
                            <div className="text-[10px] font-semibold leading-snug text-gray-400">{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClasses}>Training days each week</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[2, 3, 4, 5, 6].map(days => (
                            <button
                              key={days}
                              type="button"
                              aria-pressed={watch('daysPerWeek') === days}
                              onClick={() => syncWorkoutDaySelection(days)}
                              className={`min-h-11 rounded-xl font-bold transition-all ${watch('daysPerWeek') === days ? 'bg-white text-slate-950' : 'bg-white/[0.05] text-slate-300 hover:bg-white/10'}`}
                            >{days}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-experience">Training experience</label>
                        <select id="onboarding-experience" {...register('experience')} className={inputClasses}>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-duration">Session length</label>
                        <select id="onboarding-duration" {...register('workoutDuration', { valueAsNumber: true })} className={inputClasses}>
                          {[30, 45, 60, 75, 90].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-gym-type">Training location</label>
                        <select id="onboarding-gym-type" {...register('gymType')} className={inputClasses}>
                          <option value="commercial">Commercial gym</option>
                          <option value="home">Home gym</option>
                          <option value="crossfit">CrossFit gym</option>
                          <option value="powerlifting">Powerlifting gym</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClasses}>Days you can usually train</label>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                        {weekDayOrder.map(day => {
                          const selected = selectedWorkoutDays.includes(day);
                          return (
                            <button key={day} type="button" aria-pressed={selected} onClick={() => toggleWorkoutDay(day)} className={`min-h-11 rounded-xl border text-xs font-bold transition-all ${selected ? 'border-blue-500/40 bg-blue-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]'}`}>
                              {day.slice(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className={labelClasses}>Equipment you have access to</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {trainingEquipment.map(item => {
                          const selected = selectedEquipment.includes(item.value);
                          return (
                            <button key={item.value} type="button" aria-pressed={selected} onClick={() => toggleListValue('availableEquipment', item.value)} className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${selected ? 'border-blue-500/40 bg-blue-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}>
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 4 && (
                  <motion.div 
                    key={`step${step}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-5"
                  >
                    {safetyGroups.map(group => {
                      const selected = (watch(group.field) ?? []) as string[];
                      return (
                        <fieldset key={group.field}>
                          <legend className={labelClasses}>{group.label}</legend>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <button type="button" aria-pressed={selected.length === 0} onClick={() => setValue(group.field as any, [], { shouldDirty: true })} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${selected.length === 0 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}>None</button>
                            {group.options.map(option => (
                              <button key={option} type="button" aria-pressed={selected.includes(option)} onClick={() => toggleListValue(group.field, option)} className={`min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${selected.includes(option) ? 'border-blue-500/40 bg-blue-500/15 text-white' : 'border-white/10 bg-white/[0.03] text-slate-400'}`}>
                                {option}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      );
                    })}
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-health-info">Anything else your coach should know? <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                      <textarea id="onboarding-health-info" {...register('additionalHealthInfo')} rows={3} className={inputClasses} placeholder="Share relevant exercise considerations" />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-500">If you have pain, a medical condition, or a recent surgery, check with a qualified clinician before starting a new exercise plan.</p>
                  </motion.div>
                )}

                {step === 5 && (
                  <motion.div key="step5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-activity">Usual activity level</label>
                      <select id="onboarding-activity" {...register('activityLevel')} className={inputClasses}>
                        <option value="sedentary">Mostly sitting</option><option value="light">Lightly active</option><option value="moderate">Moderately active</option><option value="heavy">Very active</option><option value="athlete">Athlete / highly active</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-job-type">Workday movement</label>
                      <select id="onboarding-job-type" {...register('jobType')} className={inputClasses}>
                        <option value="sitting">Mostly seated</option><option value="standing">Mostly standing</option><option value="physical">Physical work</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-occupation">Occupation <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                      <input id="onboarding-occupation" {...register('occupation')} className={inputClasses} placeholder="For example, student" />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-steps">Typical daily steps</label>
                      <input id="onboarding-steps" {...register('dailySteps', { valueAsNumber: true })} type="number" inputMode="numeric" min="0" step="500" className={inputClasses} placeholder="6000" />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-sleep">Sleep per night (hours)</label>
                      <input id="onboarding-sleep" {...register('sleepHours', { valueAsNumber: true, min: 0, max: 24 })} type="number" inputMode="decimal" min="0" max="24" step="0.5" className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-stress">Typical stress level</label>
                      <select id="onboarding-stress" {...register('stressLevel')} className={inputClasses}>
                        <option value="low">Low</option><option value="medium">Moderate</option><option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-water">Daily water goal (liters)</label>
                      <input id="onboarding-water" {...register('dailyWaterIntakeLiters', { valueAsNumber: true })} type="number" inputMode="decimal" min="0.5" max="10" step="0.5" className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-smoking">Do you smoke?</label>
                      <select id="onboarding-smoking" value={watch('smokingHabit') ? 'yes' : 'no'} onChange={event => setValue('smokingHabit', event.target.value === 'yes')} className={inputClasses}>
                        <option value="no">No</option><option value="yes">Yes</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClasses} htmlFor="onboarding-alcohol">Alcohol consumption</label>
                      <select id="onboarding-alcohol" {...register('alcoholConsumption')} className={inputClasses}>
                        <option value="none">None</option><option value="light">Occasional</option><option value="moderate">Moderate</option><option value="heavy">Frequent</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {step === 6 && (
                  <motion.div key="step6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-food-preference">Food preference</label>
                      <select id="onboarding-food-preference" {...register('foodPreference')} className={inputClasses}>
                        <option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="jain">Jain</option><option value="eggetarian">Eggetarian</option><option value="non_veg">Non-vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-cuisine">Cuisine preference</label>
                      <select id="onboarding-cuisine" {...register('cuisinePreference')} className={inputClasses}>
                        <option value="indian">Indian</option><option value="north_indian">North Indian</option><option value="south_indian">South Indian</option><option value="gujarati">Gujarati</option><option value="punjabi">Punjabi</option><option value="continental">Continental</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-country">Country</label>
                      <input id="onboarding-country" {...register('country')} autoComplete="country-name" className={inputClasses} placeholder="Country" />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-budget">Daily food budget <span className="normal-case tracking-normal text-slate-500">(local currency)</span></label>
                      <input id="onboarding-budget" {...register('dailyFoodBudget', { valueAsNumber: true, min: 0 })} type="number" inputMode="decimal" min="0" className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-meals">Meals per day</label>
                      <select id="onboarding-meals" {...register('numberOfMeals', { valueAsNumber: true })} className={inputClasses}>
                        {[2, 3, 4, 5, 6].map(meals => <option key={meals} value={meals}>{meals} meals</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-allergies">Allergies or foods to avoid</label>
                      <input id="onboarding-allergies" value={(watch('allergies') ?? []).join(', ')} onChange={event => updateTextList('allergies', event.target.value)} className={inputClasses} placeholder="Separate items with commas" />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-favorites">Foods you enjoy <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                      <input id="onboarding-favorites" value={(watch('favoriteFoods') ?? []).join(', ')} onChange={event => updateTextList('favoriteFoods', event.target.value)} className={inputClasses} placeholder="Oats, lentils, eggs" />
                    </div>
                    <div>
                      <label className={labelClasses} htmlFor="onboarding-dislikes">Foods you dislike <span className="normal-case tracking-normal text-slate-500">(optional)</span></label>
                      <input id="onboarding-dislikes" value={(watch('dislikedFoods') ?? []).join(', ')} onChange={event => updateTextList('dislikedFoods', event.target.value)} className={inputClasses} placeholder="Separate items with commas" />
                    </div>
                  </motion.div>
                )}

                {step === 7 && (
                  <motion.div key="step7" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-wake-time">Usual wake-up time</label>
                        <input id="onboarding-wake-time" {...register('wakeupTime')} type="time" className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-workout-time">Preferred workout time</label>
                        <input id="onboarding-workout-time" {...register('workoutTime')} type="time" className={inputClasses} />
                      </div>
                      <div>
                        <label className={labelClasses} htmlFor="onboarding-sleep-time">Usual bedtime</label>
                        <input id="onboarding-sleep-time" {...register('sleepTime')} type="time" className={inputClasses} />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.06] p-4">
                      <p className="text-sm font-bold text-blue-100">Your schedule can change later</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">These times help place workouts and meals around your routine. They do not need to be exact.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col-reverse gap-3 border-t border-white/5 pt-6 sm:flex-row sm:gap-4 sm:pt-8">
                {step > 1 && (
                  <button 
                    type="button" onClick={() => setStep(step - 1)}
                    className="min-h-12 flex-1 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-white/10"
                  >
                    Back
                  </button>
                )}
                
                {step < 7 ? (
                  <button 
                    type="button" onClick={handleContinue}
                    className="min-h-12 flex-[2] rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-[0.99]"
                  >
                    Continue
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="min-h-12 flex-[2] rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-slate-950 shadow-xl transition-all hover:bg-slate-100 active:scale-[0.99]"
                  >
                    Generate my plan
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
