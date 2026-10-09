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
import type { UserProfile, Goal, Equipment } from '../types/user';
import {
  Dumbbell, Activity, Flame, Sparkles, Zap, ChevronRight, ChevronLeft,
  User, Ruler, Target, ShieldAlert, Heart, Utensils, Clock, CheckCircle2
} from 'lucide-react';

// Shared styles
const inputStyle =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all';
const labelStyle =
  'block text-xs font-semibold text-slate-300 mb-2';

const stepIcons = [User, Ruler, Target, ShieldAlert, Heart, Utensils, Clock];

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
      name: '', email: '', phone: '',
      selectedWorkoutDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      age: 26, gender: 'male', heightCm: 178, weightKg: 74, goalWeightKg: 70,
      bodyFatPercent: 16, muscleMassPercent: 40, waterPercent: 60,
      experience: 'beginner', goal: 'recomposition', daysPerWeek: 4,
      workoutDuration: 60, gymType: 'commercial',
      availableEquipment: ['dumbbell', 'barbell', 'cable', 'machine', 'bodyweight'],
      injuries: [], mobilityIssues: [], previousSurgeries: [],
      activityLevel: 'moderate', occupation: 'Office Worker', jobType: 'sitting',
      dailySteps: 6000, sleepHours: 7, stressLevel: 'medium', dailyWaterIntakeLiters: 2.5,
      muscleRatings: { chest: 5, back: 5, shoulders: 5, arms: 5, legs: 5, core: 5 },
      cuisinePreference: 'indian', smokingHabit: false, alcoholConsumption: 'none',
      country: 'India', foodPreference: 'vegetarian', dailyFoodBudget: 300,
      numberOfMeals: 3, allergies: [], favoriteFoods: [], dislikedFoods: [],
      workoutTime: '07:00', wakeupTime: '06:30', sleepTime: '22:30',
      xp: 100, level: 1, badges: [], streak: 1,
      ...(existingProfile ?? {}), ...prefill,
    },
  });

  const weight = watch('weightKg');
  const height = watch('heightCm');
  const age = watch('age');
  const gender = watch('gender');
  const activityLevel = watch('activityLevel');
  const selectedEquipment = watch('availableEquipment') || [];
  const selectedWorkoutDays = watch('selectedWorkoutDays') || [];

  const [liveMetrics, setLiveMetrics] = useState({ bmi: 23, bmr: 1700, tdee: 2300 });
  useEffect(() => {
    const w = Number(weight) || 70, h = Number(height) || 175, a = Number(age) || 25;
    const bmrVal = calculateBMR(w, h, a, gender);
    setLiveMetrics({
      bmi: Math.round(calculateBMI(w, h) * 10) / 10,
      bmr: Math.round(bmrVal),
      tdee: Math.round(calculateTDEE(bmrVal, activityLevel)),
    });
  }, [weight, height, age, gender, activityLevel]);

  const syncWorkoutDaySelection = (nextDays: number) => {
    const current = [...(watch('selectedWorkoutDays') || [])].filter(d => weekDayOrder.includes(d));
    const fallback = [...new Set([...current, ...weekDayOrder])].filter(d => weekDayOrder.includes(d));
    const next = fallback.slice(0, nextDays);
    setValue('daysPerWeek', nextDays);
    setValue('selectedWorkoutDays', next.length > 0 ? next : weekDayOrder.slice(0, nextDays));
  };

  const toggleWorkoutDay = (day: string) => {
    const current = [...(watch('selectedWorkoutDays') || [])].filter(d => weekDayOrder.includes(d));
    if (current.includes(day)) {
      if (current.length === 1) return;
      const next = current.filter(d => d !== day);
      setValue('selectedWorkoutDays', next);
      setValue('daysPerWeek', next.length);
    } else {
      const next = [...current, day].sort((a, b) => weekDayOrder.indexOf(a) - weekDayOrder.indexOf(b));
      setValue('selectedWorkoutDays', next);
      setValue('daysPerWeek', next.length);
    }
  };

  const toggleListValue = (field: 'injuries' | 'mobilityIssues' | 'previousSurgeries' | 'availableEquipment', value: string) => {
    const selected = (watch(field) ?? []) as string[];
    setValue(field as any, selected.includes(value) ? selected.filter(i => i !== value) : [...selected, value], { shouldDirty: true });
  };

  const updateTextList = (field: 'allergies' | 'favoriteFoods' | 'dislikedFoods', value: string) =>
    setValue(field, value.split(',').map(i => i.trim()).filter(Boolean), { shouldDirty: true });

  const handleContinue = async () => {
    const values = watch();
    if (step === 1) {
      const ageValue = Number(values.age);
      if (!values.name?.trim() || !Number.isInteger(ageValue) || ageValue < 13 || ageValue > 100) {
        await trigger(['name', 'age']); return;
      }
    }
    if (step === 2) {
      const h = Number(values.heightCm), w = Number(values.weightKg), t = Number(values.goalWeightKg);
      if (h < 100 || h > 250 || w < 30 || w > 350 || t < 30 || t > 350) {
        await trigger(['heightCm', 'weightKg', 'goalWeightKg']); return;
      }
    }
    setStep(s => s + 1);
  };

  const onSubmit = async (data: UserProfile) => {
    data.age = Number(data.age); data.weightKg = Number(data.weightKg); data.heightCm = Number(data.heightCm);
    data.goalWeightKg = Number(data.goalWeightKg); data.bodyFatPercent = Number(data.bodyFatPercent);
    data.muscleMassPercent = Number(data.muscleMassPercent || 0); data.waterPercent = Number(data.waterPercent || 0);
    data.sleepHours = Number(data.sleepHours); data.dailyFoodBudget = Number(data.dailyFoodBudget);
    data.numberOfMeals = Number(data.numberOfMeals);
    data.bmi = liveMetrics.bmi; data.bmr = liveMetrics.bmr; data.tdee = liveMetrics.tdee;
    data.dailyWaterIntakeLiters = calculateAllMetrics(data).waterIntakeLiters;
    setIsAnalyzing(true);
    for (let i = 1; i <= 5; i++) { await new Promise(r => setTimeout(r, 700)); setAnalysisProgress(i); }
    const diagnostics = performAdvancedDiagnostics(data);
    let rec = buildRecommendation(data);
    try { const ml = await fetchMlRecommendation(data); if (ml?.strategy && ml?.split) rec = { ...rec, ...ml, source: 'ml' }; } catch { /* local */ }
    data.recommendedStrategy = rec.strategy; data.recommendedSplit = rec.split; data.tdee = rec.tdee; data.bmr = rec.bmr;
    setDiagnosticReport({ ...diagnostics, profile: data, recommendation: rec });
    setIsAnalyzing(false); setShowReport(true);
  };

  const confirmAndProceedToDashboard = async () => {
    if (!diagnosticReport) return;
    const finalProfile = diagnosticReport.profile;
    const recommendation = diagnosticReport.recommendation ?? buildRecommendation(finalProfile);
    const profileToSave = {
      ...finalProfile,
      recommendedStrategy: recommendation.strategy, recommendedSplit: recommendation.split,
      dailyCalories: recommendation.calories, proteinTarget: recommendation.protein,
      carbsTarget: recommendation.carbs, fatTarget: recommendation.fat,
      bmr: recommendation.bmr, tdee: recommendation.tdee,
    };
    const baselineEntry = { date: new Date().toISOString().slice(0, 10), weightKg: finalProfile.weightKg, bodyFatPercent: finalProfile.bodyFatPercent, muscleMassPercent: finalProfile.muscleMassPercent, notes: 'Onboarding baseline' };
    const plan = generateWorkoutPlan(profileToSave);
    const dietPlan = generateAIDietPlan(profileToSave);
    const onboardingPayload = { ...profileToSave, recommendedStrategy: recommendation.strategy, recommendedSplit: recommendation.split, dailyCalories: recommendation.calories, proteinTarget: recommendation.protein, carbsTarget: recommendation.carbs, fatTarget: recommendation.fat, workoutPlan: plan, dietPlan };
    setProfile(profileToSave); setPlan(plan); setDietPlan(dietPlan);
    useProgressStore.getState().addEntry(baselineEntry);
    try { await saveUserProfile(profileToSave, token); } catch { /* local */ }
    try { await saveOnboardingResult(onboardingPayload, token); } catch { /* local */ }
    try { await saveProgressEntry(baselineEntry, token); } catch { /* local */ }
    navigate('/');
  };

  const handleWizardSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < 7) { void handleContinue(); return; }
    void handleSubmit(onSubmit)();
  };

  const steps = [
    { title: 'Personal Details', desc: 'Basic info to tailor your health parameters.' },
    { title: 'Body Composition', desc: 'Current measurements and desired targets.' },
    { title: 'Goals & Training', desc: 'Define your main focus, schedule, and equipment.' },
    { title: 'Injuries & Mobility', desc: 'Help us customize exercises around any limitations.' },
    { title: 'Lifestyle & Recovery', desc: 'Activity level, sleep habits, and daily movement.' },
    { title: 'Nutrition & Diet', desc: 'Preferences, dietary choices, and daily meals.' },
    { title: 'Weekly Routine', desc: 'Set your preferred sleep and workout schedule.' },
  ];

  const goalOptions: { value: Goal; title: string; desc: string; icon: any; color: string }[] = [
    { value: 'muscle_gain', title: 'Build Muscle', desc: 'Hypertrophy & size focus', icon: Dumbbell, color: 'from-blue-500 to-indigo-600' },
    { value: 'fat_loss', title: 'Fat Loss', desc: 'Caloric deficit & leaning', icon: Flame, color: 'from-orange-500 to-rose-600' },
    { value: 'strength', title: 'Strength', desc: 'Power & neuromuscular drive', icon: Zap, color: 'from-amber-500 to-yellow-600' },
    { value: 'recomposition', title: 'Recomposition', desc: 'Simultaneous muscle & fat loss', icon: Activity, color: 'from-violet-500 to-purple-600' },
  ];

  const trainingEquipment = [
    { value: 'barbell', label: 'Barbell', emoji: '🏋️' },
    { value: 'dumbbell', label: 'Dumbbells', emoji: '💪' },
    { value: 'cable', label: 'Cable', emoji: '🔗' },
    { value: 'machine', label: 'Machines', emoji: '⚙️' },
    { value: 'bodyweight', label: 'Bodyweight', emoji: '🤸' },
    { value: 'kettlebell', label: 'Kettlebells', emoji: '🫙' },
    { value: 'resistance_band', label: 'Bands', emoji: '🎗️' },
  ] as const;

  const safetyGroups = [
    { field: 'injuries' as const, label: 'Current injuries or recurring joint pain', options: ['Shoulder', 'Knee', 'Lower Back', 'Hip', 'Wrist / Elbow', 'Ankle'] },
    { field: 'mobilityIssues' as const, label: 'Challenging movement patterns', options: ['Deep Squatting', 'Hip Hinging', 'Overhead Pressing', 'Kneeling', 'Balancing'] },
    { field: 'previousSurgeries' as const, label: 'Past surgeries affecting training', options: ['Back', 'Knee', 'Shoulder', 'Hip', 'Other'] },
  ];

  const analysisSteps = [
    'Calculating Basal Metabolic Rate (BMR)',
    'Evaluating Somatotype & Volume Capacity',
    'Configuring Macro Partitioning Targets',
    'Structuring Progressive Training Split',
    'Synthesizing Adaptive Coaching Blueprint',
  ];

  // AI Loading Screen
  if (isAnalyzing) return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050816] p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="relative mx-auto mb-8 h-20 w-20">
          <motion.div
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500"
          />
          <div className="absolute inset-2 flex items-center justify-center rounded-full bg-violet-500/10">
            <Sparkles className="h-7 w-7 text-violet-400" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-black tracking-tight text-white">Generating AI Blueprint</h2>
        <p className="mb-8 text-xs text-slate-400">Analyzing your biometrics and goals to formulate custom targets.</p>
        <div className="space-y-3 text-left">
          {analysisSteps.map((text, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.12 }}
              className="flex items-center gap-3"
            >
              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-300 ${analysisProgress > idx ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/15 text-transparent'}`}>
                {analysisProgress > idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : ''}
              </div>
              <span className={`text-xs font-semibold transition-colors ${analysisProgress > idx ? 'text-white' : 'text-slate-600'}`}>{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  // AI Diagnostic Report Screen
  if (showReport && diagnosticReport) return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050816] p-4 sm:p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/90 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-500/30">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-violet-400">Plan Generated</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Your AI Blueprint is Ready</h2>
          <p className="mt-1 text-xs text-slate-400">Personalized calibration based on your targets.</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Daily Calories', value: `${diagnosticReport.recommendation?.calories}`, unit: 'kcal/day', color: 'border-orange-500/30 bg-orange-500/10' },
            { label: 'Protein Target', value: `${diagnosticReport.recommendation?.protein}g`, unit: 'daily target', color: 'border-blue-500/30 bg-blue-500/10' },
            { label: 'Est. Timeline', value: `${diagnosticReport.timelineWeeks}`, unit: 'weeks to goal', color: 'border-emerald-500/30 bg-emerald-500/10' },
            { label: 'Target Weight', value: `${diagnosticReport.profile.goalWeightKg}`, unit: 'kg goal', color: 'border-violet-500/30 bg-violet-500/10' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
              <p className="mt-1 text-2xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.unit}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recommended Strategy</p>
            <p className="text-base font-extrabold text-white">{diagnosticReport.recommendation?.strategyLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{diagnosticReport.recommendation?.strategyReason}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Workout Split</p>
            <p className="text-base font-extrabold text-white">{diagnosticReport.recommendation?.splitLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{diagnosticReport.recommendation?.splitReason}</p>
          </div>
        </div>

        <button
          onClick={confirmAndProceedToDashboard}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-extrabold text-white shadow-xl shadow-violet-500/30 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
        >
          Activate My Plan & Open Dashboard →
        </button>
      </motion.div>
    </div>
  );

  const StepIcon = stepIcons[step - 1];

  return (
    <div className="relative flex min-h-[100dvh] bg-[#050816]">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/4 top-1/6 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-1/6 right-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[150px]" />

      {/* Left sidebar — desktop */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-white/8 bg-slate-950/60 p-8 backdrop-blur-xl lg:flex z-10">
        <div className="mb-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-500/20">
            <Dumbbell className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">FitAI Onboarding</h2>
            <p className="text-[11px] text-slate-400">Personalized Setup</p>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          {steps.map((s, i) => {
            const Icon = stepIcons[i];
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition-all ${
                  active
                    ? 'bg-violet-500/15 border border-violet-500/30'
                    : 'border border-transparent'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
                      : 'bg-white/5 text-slate-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${active ? 'text-white' : done ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">Step {i + 1}</p>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Progress Footer */}
        <div className="pt-6 border-t border-white/8">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-400">
            <span>Overall Progress</span>
            <span className="text-violet-400">{Math.round(((step - 1) / 7) * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              initial={false}
              animate={{ width: `${((step - 1) / 7) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col z-10 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-white/8 bg-slate-950/70 px-4 py-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">FitAI</span>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 < step ? 'bg-emerald-500 w-3 sm:w-5' : i + 1 === step ? 'bg-violet-500 w-5 sm:w-8' : 'bg-white/10 w-3 sm:w-5'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-violet-400">{step}/7</span>
        </div>

        {/* Step container card */}
        <div className="flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-10 shadow-2xl backdrop-blur-2xl">
            {/* Step header */}
            <div className="mb-8 border-b border-white/8 pb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <StepIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Step {step} of 7</span>
                  <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{steps[step - 1].title}</h1>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">{steps[step - 1].desc}</p>
            </div>

            <form onSubmit={handleWizardSubmit}>
              <AnimatePresence mode="wait">

                {/* STEP 1: Basic info */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-5">
                    <div>
                      <label className={labelStyle} htmlFor="ob-name">Full Name</label>
                      <input id="ob-name" {...register('name', { required: 'Please enter your name.' })} autoComplete="name" className={inputStyle} placeholder="Alex Rivera" />
                      {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>}
                    </div>

                    {watch('email') && (
                      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">Account Email</span>
                        <p className="text-sm font-semibold text-slate-200">{watch('email')}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle} htmlFor="ob-age">Age</label>
                        <input id="ob-age" {...register('age', { valueAsNumber: true, min: { value: 13, message: 'Must be 13 or older.' }, max: { value: 100, message: 'Must be under 100.' } })} type="number" inputMode="numeric" min="13" max="100" className={inputStyle} placeholder="26" />
                        {errors.age && <p className="mt-1.5 text-xs text-rose-400">{errors.age.message}</p>}
                      </div>
                      <div>
                        <label className={labelStyle} htmlFor="ob-gender">Gender (for metabolic rate calculations)</label>
                        <select id="ob-gender" {...register('gender')} className={inputStyle}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle} htmlFor="ob-phone">Phone Number <span className="font-normal text-slate-500">(optional)</span></label>
                      <input id="ob-phone" {...register('phone')} type="tel" autoComplete="tel" className={inputStyle} placeholder="+1 555-0198" />
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: Body stats */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelStyle} htmlFor="ob-height">Height (cm)</label>
                        <input id="ob-height" {...register('heightCm', { valueAsNumber: true, min: 100, max: 250 })} type="number" inputMode="decimal" min="100" max="250" className={inputStyle} placeholder="178" />
                      </div>
                      <div>
                        <label className={labelStyle} htmlFor="ob-weight">Current Weight (kg)</label>
                        <input id="ob-weight" {...register('weightKg', { valueAsNumber: true, min: 30, max: 350 })} type="number" inputMode="decimal" step="0.5" className={inputStyle} placeholder="74" />
                      </div>
                      <div>
                        <label className={labelStyle} htmlFor="ob-goal-weight">Target Weight (kg)</label>
                        <input id="ob-goal-weight" {...register('goalWeightKg', { valueAsNumber: true, min: 30, max: 350 })} type="number" inputMode="decimal" step="0.5" className={inputStyle} placeholder="70" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle} htmlFor="ob-body-fat">Body Fat % <span className="font-normal text-slate-500">(optional)</span></label>
                        <input id="ob-body-fat" {...register('bodyFatPercent', { valueAsNumber: true })} type="number" inputMode="decimal" min="1" max="70" step="0.5" className={inputStyle} placeholder="16" />
                      </div>
                      <div>
                        <label className={labelStyle} htmlFor="ob-muscle">Muscle Mass % <span className="font-normal text-slate-500">(optional)</span></label>
                        <input id="ob-muscle" {...register('muscleMassPercent', { valueAsNumber: true })} type="number" inputMode="decimal" min="1" max="90" step="0.5" className={inputStyle} placeholder="40" />
                      </div>
                    </div>

                    {/* Live Calculated Stats Preview */}
                    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">BMI Index</p>
                        <p className="mt-1 text-lg font-black text-white">{liveMetrics.bmi}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Basal BMR</p>
                        <p className="mt-1 text-lg font-black text-white">{liveMetrics.bmr} <span className="text-xs text-slate-400 font-normal">kcal</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Daily TDEE</p>
                        <p className="mt-1 text-lg font-black text-white">{liveMetrics.tdee} <span className="text-xs text-slate-400 font-normal">kcal</span></p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Goals & Training */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-7">
                    {/* Goal selection cards */}
                    <div>
                      <label className={labelStyle}>Select Your Primary Goal</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {goalOptions.map(opt => {
                          const active = watch('goal') === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setValue('goal', opt.value)}
                              className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                                active
                                  ? 'border-violet-500 bg-violet-500/15 shadow-lg shadow-violet-500/10'
                                  : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15'
                              }`}
                            >
                              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${opt.color} shadow-md`}>
                                <opt.icon className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold text-white">{opt.title}</p>
                                  {active && <span className="h-2 w-2 rounded-full bg-violet-400 ring-4 ring-violet-500/20" />}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Workout Days per week */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className={labelStyle}>Training Days Each Week</label>
                        <span className="text-xs font-bold text-violet-400">{watch('daysPerWeek')} Days / Week</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2.5">
                        {[2, 3, 4, 5, 6].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => syncWorkoutDaySelection(d)}
                            className={`rounded-xl py-3 text-sm font-extrabold transition-all border ${
                              watch('daysPerWeek') === d
                                ? 'bg-violet-600 border-violet-500 text-white shadow-md shadow-violet-500/25'
                                : 'bg-white/[0.03] border-white/8 text-slate-400 hover:text-white hover:bg-white/[0.06]'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Days you can train */}
                    <div>
                      <label className={labelStyle}>Specific Days You Usually Train</label>
                      <div className="grid grid-cols-7 gap-2">
                        {weekDayOrder.map(day => {
                          const sel = selectedWorkoutDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleWorkoutDay(day)}
                              className={`rounded-xl py-3 text-center transition-all border ${
                                sel
                                  ? 'bg-violet-600/20 border-violet-500/50 text-white'
                                  : 'bg-white/[0.02] border-white/8 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <span className="block text-xs font-black">{day.slice(0, 3)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Experience, Duration & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelStyle} htmlFor="ob-exp">Experience Level</label>
                        <select id="ob-exp" {...register('experience')} className={inputStyle}>
                          <option value="beginner">Beginner (0-1 yr)</option>
                          <option value="intermediate">Intermediate (1-3 yrs)</option>
                          <option value="advanced">Advanced (3+ yrs)</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle} htmlFor="ob-duration">Session Length</label>
                        <select id="ob-duration" {...register('workoutDuration', { valueAsNumber: true })} className={inputStyle}>
                          {[30, 45, 60, 75, 90].map(m => <option key={m} value={m}>{m} minutes</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle} htmlFor="ob-gym">Training Location</label>
                        <select id="ob-gym" {...register('gymType')} className={inputStyle}>
                          <option value="commercial">Commercial Gym</option>
                          <option value="home">Home Gym</option>
                          <option value="crossfit">CrossFit Box</option>
                          <option value="powerlifting">Powerlifting Gym</option>
                        </select>
                      </div>
                    </div>

                    {/* Equipment selection */}
                    <div>
                      <label className={labelStyle}>Available Equipment</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {trainingEquipment.map(item => {
                          const sel = selectedEquipment.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => toggleListValue('availableEquipment', item.value)}
                              className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                                sel
                                  ? 'border-violet-500/50 bg-violet-500/15 text-white'
                                  : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="text-xl">{item.emoji}</span>
                              <span className="text-xs font-bold">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Injuries & Safety */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-6">
                    {safetyGroups.map(group => {
                      const selected = (watch(group.field) ?? []) as string[];
                      return (
                        <div key={group.field} className="space-y-2">
                          <label className={labelStyle}>{group.label}</label>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setValue(group.field as any, [], { shouldDirty: true })}
                              className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                                selected.length === 0
                                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                                  : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-white'
                              }`}
                            >
                              ✓ None
                            </button>
                            {group.options.map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => toggleListValue(group.field, opt)}
                                className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                                  selected.includes(opt)
                                    ? 'border-violet-500/50 bg-violet-500/20 text-white'
                                    : 'border-white/8 bg-white/[0.02] text-slate-400 hover:text-white'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    <div>
                      <label className={labelStyle} htmlFor="ob-health-info">Other Considerations <span className="font-normal text-slate-500">(optional)</span></label>
                      <textarea id="ob-health-info" {...register('additionalHealthInfo')} rows={3} className={inputStyle} placeholder="E.g. Recent hamstring tightness, desk posture..." />
                    </div>

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-200/80 leading-relaxed">
                      ⚠️ Note: This tool provides training recommendations and is not medical advice. Check with your doctor if you have persistent pain.
                    </div>
                  </motion.div>
                )}

                {/* STEP 5: Lifestyle */}
                {step === 5 && (
                  <motion.div key="s5" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyle} htmlFor="ob-activity">Activity Level</label>
                      <select id="ob-activity" {...register('activityLevel')} className={inputStyle}>
                        <option value="sedentary">Sedentary (Desk Job)</option>
                        <option value="light">Lightly Active</option>
                        <option value="moderate">Moderately Active</option>
                        <option value="heavy">Very Active</option>
                        <option value="athlete">Athlete / Intense Training</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-job">Workday Movement</label>
                      <select id="ob-job" {...register('jobType')} className={inputStyle}>
                        <option value="sitting">Mostly Sitting</option>
                        <option value="standing">Mostly Standing</option>
                        <option value="physical">Heavy Physical Labor</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-steps">Daily Steps Target</label>
                      <input id="ob-steps" {...register('dailySteps', { valueAsNumber: true })} type="number" inputMode="numeric" step="500" className={inputStyle} placeholder="6000" />
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-sleep">Sleep per Night (Hours)</label>
                      <input id="ob-sleep" {...register('sleepHours', { valueAsNumber: true, min: 0, max: 24 })} type="number" inputMode="decimal" min="0" max="24" step="0.5" className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-stress">Typical Stress Level</label>
                      <select id="ob-stress" {...register('stressLevel')} className={inputStyle}>
                        <option value="low">Low</option>
                        <option value="medium">Moderate</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-water">Daily Water Target (Liters)</label>
                      <input id="ob-water" {...register('dailyWaterIntakeLiters', { valueAsNumber: true })} type="number" inputMode="decimal" min="0.5" max="10" step="0.5" className={inputStyle} />
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-smoke">Do you smoke?</label>
                      <select id="ob-smoke" value={watch('smokingHabit') ? 'yes' : 'no'} onChange={e => setValue('smokingHabit', e.target.value === 'yes')} className={inputStyle}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-alcohol">Alcohol Consumption</label>
                      <select id="ob-alcohol" {...register('alcoholConsumption')} className={inputStyle}>
                        <option value="none">None</option>
                        <option value="light">Occasional</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Frequent</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {/* STEP 6: Food & Nutrition */}
                {step === 6 && (
                  <motion.div key="s6" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelStyle} htmlFor="ob-food-pref">Dietary Preference</label>
                      <select id="ob-food-pref" {...register('foodPreference')} className={inputStyle}>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="jain">Jain</option>
                        <option value="eggetarian">Eggetarian</option>
                        <option value="non_veg">Non-Vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-cuisine">Cuisine Style</label>
                      <select id="ob-cuisine" {...register('cuisinePreference')} className={inputStyle}>
                        <option value="indian">Indian</option>
                        <option value="north_indian">North Indian</option>
                        <option value="south_indian">South Indian</option>
                        <option value="gujarati">Gujarati</option>
                        <option value="punjabi">Punjabi</option>
                        <option value="continental">Continental</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-country">Country</label>
                      <input id="ob-country" {...register('country')} autoComplete="country-name" className={inputStyle} placeholder="India" />
                    </div>
                    <div>
                      <label className={labelStyle} htmlFor="ob-meals">Meals per Day</label>
                      <select id="ob-meals" {...register('numberOfMeals', { valueAsNumber: true })} className={inputStyle}>
                        {[2, 3, 4, 5, 6].map(m => <option key={m} value={m}>{m} meals</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelStyle} htmlFor="ob-allergies">Allergies or Foods to Exclude</label>
                      <input id="ob-allergies" value={(watch('allergies') ?? []).join(', ')} onChange={e => updateTextList('allergies', e.target.value)} className={inputStyle} placeholder="Peanuts, lactose, gluten (separate by commas)" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelStyle} htmlFor="ob-favorites">Favorite Foods <span className="font-normal text-slate-500">(optional)</span></label>
                      <input id="ob-favorites" value={(watch('favoriteFoods') ?? []).join(', ')} onChange={e => updateTextList('favoriteFoods', e.target.value)} className={inputStyle} placeholder="Paneer, oats, eggs, rice" />
                    </div>
                  </motion.div>
                )}

                {/* STEP 7: Weekly Schedule */}
                {step === 7 && (
                  <motion.div key="s7" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
                        <span className="text-2xl mb-1 block">🌅</span>
                        <label className={labelStyle} htmlFor="ob-wake">Wake-up Time</label>
                        <input id="ob-wake" {...register('wakeupTime')} type="time" className={inputStyle} />
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
                        <span className="text-2xl mb-1 block">🏋️</span>
                        <label className={labelStyle} htmlFor="ob-workout">Workout Time</label>
                        <input id="ob-workout" {...register('workoutTime')} type="time" className={inputStyle} />
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
                        <span className="text-2xl mb-1 block">🌙</span>
                        <label className={labelStyle} htmlFor="ob-sleep">Bedtime</label>
                        <input id="ob-sleep" {...register('sleepTime')} type="time" className={inputStyle} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5 text-center">
                      <h4 className="text-sm font-bold text-violet-200">You're All Set!</h4>
                      <p className="mt-1 text-xs text-slate-400">Click below to generate your custom workout split, macronutrient distribution, and coaching routine.</p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Navigation Bar */}
              <div className="mt-10 flex items-center justify-between border-t border-white/8 pt-6">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-slate-200 transition-all hover:bg-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                ) : <div />}

                {step < 7 ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-[0.99]"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3 text-xs font-bold text-white shadow-xl shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
                  >
                    <Sparkles className="h-4 w-4" /> Generate My Plan
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
