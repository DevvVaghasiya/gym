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

// ─── Shared style tokens ───────────────────────────────────────────────────────
const input =
  'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all';
const label =
  'block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5';

const pill = (active: boolean, danger = false) =>
  `min-h-10 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
    active
      ? danger
        ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
        : 'border-violet-500/40 bg-violet-500/20 text-white shadow-sm shadow-violet-500/10'
      : 'border-white/8 bg-white/4 text-slate-400 hover:bg-white/8 hover:text-slate-200'
  }`;

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

  const toggleEquipment = (eq: Equipment) => {
    const current = [...selectedEquipment];
    const idx = current.indexOf(eq);
    if (idx > -1) current.splice(idx, 1); else current.push(eq);
    setValue('availableEquipment', current);
  };

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
    for (let i = 1; i <= 5; i++) { await new Promise(r => setTimeout(r, 800)); setAnalysisProgress(i); }
    const diagnostics = performAdvancedDiagnostics(data);
    let rec = buildRecommendation(data);
    try { const ml = await fetchMlRecommendation(data); if (ml?.strategy && ml?.split) rec = { ...rec, ...ml, source: 'ml' }; } catch { /* local fallback */ }
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
    { title: 'About You', desc: 'Start with the basics — name, age and gender.' },
    { title: 'Body Stats', desc: 'Your measurements help us build accurate targets.' },
    { title: 'Goals & Training', desc: 'Choose your goal and training setup.' },
    { title: 'Injuries & Safety', desc: 'Help us keep your plan safe and effective.' },
    { title: 'Lifestyle', desc: 'Daily habits shape your recovery and targets.' },
    { title: 'Food & Nutrition', desc: 'Preferences and restrictions for your diet.' },
    { title: 'Your Schedule', desc: 'Set a routine around your week.' },
  ];

  const goalOptions: { value: Goal; title: string; desc: string; icon: any; color: string }[] = [
    { value: 'muscle_gain', title: 'Build Muscle', desc: 'Hypertrophy & size', icon: Dumbbell, color: 'from-blue-500 to-indigo-600' },
    { value: 'fat_loss', title: 'Fat Loss', desc: 'Caloric deficit', icon: Flame, color: 'from-orange-500 to-rose-600' },
    { value: 'strength', title: 'Strength', desc: 'Performance focus', icon: Zap, color: 'from-yellow-400 to-amber-600' },
    { value: 'recomposition', title: 'Recomp', desc: 'Muscle + fat loss', icon: Activity, color: 'from-violet-500 to-purple-600' },
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
    { field: 'injuries' as const, label: 'Current injuries or recurring pain', options: ['Shoulder', 'Knee', 'Back', 'Hip', 'Wrist or elbow', 'Ankle'] },
    { field: 'mobilityIssues' as const, label: 'Movements you find difficult', options: ['Squatting', 'Hip hinging', 'Overhead reaching', 'Kneeling', 'Balancing'] },
    { field: 'previousSurgeries' as const, label: 'Previous surgeries that affect exercise', options: ['Back', 'Knee', 'Shoulder', 'Hip', 'Other'] },
  ];

  const analysisSteps = [
    'Calculating BMR & Somatotype',
    'Evaluating Muscular Imbalances',
    'Determining Recovery Capacity',
    'Structuring Macro Partitioning',
    'Generating Adaptive Routine',
  ];

  // ─── AI Loading Screen ─────────────────────────────────────────────────────
  if (isAnalyzing) return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050816] p-6">
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto mb-10 h-24 w-24">
          <motion.div
            animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500"
          />
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-violet-500/10">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-white">Analyzing Your Profile</h2>
        <p className="mb-10 text-sm text-slate-400">Crafting your personalized AI fitness blueprint…</p>
        <div className="space-y-3 text-left">
          {analysisSteps.map((text, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15 }}
              className="flex items-center gap-3"
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-500 ${analysisProgress > idx ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/15 text-transparent'}`}>
                {analysisProgress > idx ? <CheckCircle2 className="h-3.5 w-3.5" /> : ''}
              </div>
              <span className={`text-sm font-semibold transition-colors ${analysisProgress > idx ? 'text-white' : 'text-slate-600'}`}>{text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── AI Report Screen ──────────────────────────────────────────────────────
  if (showReport && diagnosticReport) return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#050816] p-4 sm:p-6">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-violet-400">AI Blueprint Ready</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Your Personalized Plan</h2>
          <p className="mt-2 text-sm text-slate-400">Based on your profile, here's what we recommend.</p>
        </div>

        {/* Stats grid */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Daily Calories', value: `${diagnosticReport.recommendation?.calories}`, unit: 'kcal', color: 'from-orange-500/20 to-rose-500/10 border-orange-500/20' },
            { label: 'Protein', value: `${diagnosticReport.recommendation?.protein}g`, unit: 'daily', color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/20' },
            { label: 'Est. Timeline', value: `${diagnosticReport.timelineWeeks}`, unit: 'weeks', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20' },
            { label: 'Target Weight', value: `${diagnosticReport.profile.goalWeightKg}`, unit: 'kg', color: 'from-violet-500/20 to-purple-500/10 border-violet-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border bg-gradient-to-br p-4 ${s.color}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-slate-500">{s.unit}</p>
            </div>
          ))}
        </div>

        {/* Strategy & Split */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Strategy</p>
            <p className="text-lg font-extrabold text-white">{diagnosticReport.recommendation?.strategyLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{diagnosticReport.recommendation?.strategyReason}</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Training Split</p>
            <p className="text-lg font-extrabold text-white">{diagnosticReport.recommendation?.splitLabel}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{diagnosticReport.recommendation?.splitReason}</p>
          </div>
        </div>

        <button
          onClick={confirmAndProceedToDashboard}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-base font-extrabold text-white shadow-2xl shadow-violet-500/30 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
        >
          Activate My Plan →
        </button>
      </motion.div>
    </div>
  );

  // ─── Main Wizard ───────────────────────────────────────────────────────────
  const StepIcon = stepIcons[step - 1];

  return (
    <div className="flex min-h-[100dvh] bg-[#050816]">
      {/* Left sidebar — desktop only */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-white/6 bg-white/[0.02] p-8 lg:flex">
        <div className="mb-10 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
            <Dumbbell className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-extrabold text-white">FitAI Setup</span>
        </div>
        <nav className="space-y-1">
          {steps.map((s, i) => {
            const Icon = stepIcons[i];
            const done = i + 1 < step;
            const active = i + 1 === step;
            return (
              <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${active ? 'bg-violet-500/15' : ''}`}>
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${done ? 'bg-emerald-500 text-white' : active ? 'bg-violet-500 text-white' : 'bg-white/6 text-slate-600'}`}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div>
                  <p className={`text-xs font-bold ${active ? 'text-white' : done ? 'text-slate-400' : 'text-slate-600'}`}>{s.title}</p>
                </div>
              </div>
            );
          })}
        </nav>
        {/* Progress bar */}
        <div className="mt-auto">
          <div className="mb-2 flex justify-between text-[10px] font-bold text-slate-600">
            <span>Progress</span><span>{Math.round(((step - 1) / 7) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/6">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
              initial={false}
              animate={{ width: `${((step - 1) / 7) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Dumbbell className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">FitAI</span>
          </div>
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 < step ? 'bg-emerald-500 w-4' : i + 1 === step ? 'bg-violet-500 w-6' : 'bg-white/10 w-4'}`} />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-400">{step}/7</span>
        </div>

        {/* Step content */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-xl">
            {/* Step header */}
            <div className="mb-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-violet-500/30">
                  <StepIcon className="h-5 w-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Step {step} of 7</p>
                  <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{steps[step - 1].title}</h1>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">{steps[step - 1].desc}</p>
            </div>

            <form onSubmit={handleWizardSubmit}>
              <AnimatePresence mode="wait">

                {/* ── Step 1: About You ── */}
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div>
                      <label className={label} htmlFor="ob-name">Full name</label>
                      <input id="ob-name" {...register('name', { required: 'Enter your name to continue.' })} autoComplete="name" className={input} placeholder="Your name" />
                      {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name.message}</p>}
                    </div>

                    {watch('email') && (
                      <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
                        <p className={label}>Account email</p>
                        <p className="text-sm font-semibold text-slate-200">{watch('email')}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label} htmlFor="ob-age">Age</label>
                        <input id="ob-age" {...register('age', { valueAsNumber: true, min: { value: 13, message: 'Must be 13+.' }, max: { value: 100, message: 'Must be under 100.' } })} type="number" inputMode="numeric" min="13" max="100" className={input} placeholder="25" />
                        {errors.age && <p className="mt-1.5 text-xs text-rose-400">{errors.age.message}</p>}
                      </div>
                      <div>
                        <label className={label} htmlFor="ob-gender">Gender</label>
                        <select id="ob-gender" {...register('gender')} className={input}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={label} htmlFor="ob-phone">Phone <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                      <input id="ob-phone" {...register('phone')} type="tel" autoComplete="tel" className={input} placeholder="Contact number" />
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: Body Stats ── */}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label} htmlFor="ob-height">Height (cm)</label>
                        <input id="ob-height" {...register('heightCm', { valueAsNumber: true, min: 100, max: 250 })} type="number" inputMode="decimal" min="100" max="250" className={input} placeholder="178" />
                      </div>
                      <div>
                        <label className={label} htmlFor="ob-weight">Current weight (kg)</label>
                        <input id="ob-weight" {...register('weightKg', { valueAsNumber: true, min: 30, max: 350 })} type="number" inputMode="decimal" step="0.1" className={input} placeholder="74" />
                      </div>
                      <div>
                        <label className={label} htmlFor="ob-goal-weight">Target weight (kg)</label>
                        <input id="ob-goal-weight" {...register('goalWeightKg', { valueAsNumber: true, min: 30, max: 350 })} type="number" inputMode="decimal" step="0.1" className={input} placeholder="70" />
                      </div>
                      <div>
                        <label className={label} htmlFor="ob-body-fat">Body fat % <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                        <input id="ob-body-fat" {...register('bodyFatPercent', { valueAsNumber: true })} type="number" inputMode="decimal" min="1" max="70" step="0.1" className={input} placeholder="If known" />
                      </div>
                      <div className="col-span-2">
                        <label className={label} htmlFor="ob-muscle">Muscle mass % <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                        <input id="ob-muscle" {...register('muscleMassPercent', { valueAsNumber: true })} type="number" inputMode="decimal" min="1" max="90" step="0.1" className={input} placeholder="If known" />
                      </div>
                    </div>

                    {/* Live metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'BMI', value: liveMetrics.bmi, color: 'from-blue-500/15 to-indigo-500/10 border-blue-500/20' },
                        { label: 'BMR', value: `${liveMetrics.bmr} kcal`, color: 'from-violet-500/15 to-purple-500/10 border-violet-500/20' },
                        { label: 'Daily Burn', value: `${liveMetrics.tdee} kcal`, color: 'from-orange-500/15 to-rose-500/10 border-orange-500/20' },
                      ].map(m => (
                        <div key={m.label} className={`rounded-2xl border bg-gradient-to-br p-3 text-center ${m.color}`}>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{m.label}</p>
                          <p className="mt-1 text-sm font-extrabold text-white">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: Goals & Training ── */}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    {/* Goal cards */}
                    <div>
                      <label className={label}>Your main goal</label>
                      <div className="grid grid-cols-2 gap-3">
                        {goalOptions.map(opt => {
                          const active = watch('goal') === opt.value;
                          return (
                            <button key={opt.value} type="button" onClick={() => setValue('goal', opt.value)}
                              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${active ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/10' : 'border-white/8 bg-white/3 hover:bg-white/6'}`}>
                              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${opt.color}`}>
                                <opt.icon className="h-4.5 w-4.5 text-white" />
                              </div>
                              <p className="text-sm font-bold text-white">{opt.title}</p>
                              <p className="text-xs text-slate-500">{opt.desc}</p>
                              {active && <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-violet-400" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Training days */}
                    <div>
                      <label className={label}>Days per week</label>
                      <div className="flex gap-2">
                        {[2, 3, 4, 5, 6].map(d => (
                          <button key={d} type="button" onClick={() => syncWorkoutDaySelection(d)}
                            className={`flex-1 rounded-xl py-3 text-sm font-extrabold transition-all ${watch('daysPerWeek') === d ? 'bg-gradient-to-b from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-slate-400 hover:bg-white/8'}`}>
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Days grid */}
                    <div>
                      <label className={label}>Days you can train</label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {weekDayOrder.map(day => {
                          const sel = selectedWorkoutDays.includes(day);
                          return (
                            <button key={day} type="button" onClick={() => toggleWorkoutDay(day)}
                              className={`rounded-xl py-2.5 text-[10px] font-bold transition-all ${sel ? 'bg-violet-500/20 border border-violet-500/40 text-white' : 'bg-white/4 border border-white/6 text-slate-500 hover:text-slate-300'}`}>
                              {day.slice(0, 1)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {selectedWorkoutDays.map(d => (
                          <span key={d} className="rounded-lg bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">{d.slice(0, 3)}</span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={label} htmlFor="ob-exp">Experience level</label>
                        <select id="ob-exp" {...register('experience')} className={input}>
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div>
                        <label className={label} htmlFor="ob-duration">Session length</label>
                        <select id="ob-duration" {...register('workoutDuration', { valueAsNumber: true })} className={input}>
                          {[30, 45, 60, 75, 90].map(m => <option key={m} value={m}>{m} min</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className={label} htmlFor="ob-gym">Training location</label>
                        <select id="ob-gym" {...register('gymType')} className={input}>
                          <option value="commercial">Commercial gym</option>
                          <option value="home">Home gym</option>
                          <option value="crossfit">CrossFit gym</option>
                          <option value="powerlifting">Powerlifting gym</option>
                        </select>
                      </div>
                    </div>

                    {/* Equipment */}
                    <div>
                      <label className={label}>Equipment you have access to</label>
                      <div className="grid grid-cols-4 gap-2">
                        {trainingEquipment.map(item => {
                          const sel = selectedEquipment.includes(item.value);
                          return (
                            <button key={item.value} type="button" onClick={() => toggleListValue('availableEquipment', item.value)}
                              className={`rounded-xl border py-2.5 text-center transition-all ${sel ? 'border-violet-500/40 bg-violet-500/15 text-white' : 'border-white/8 bg-white/4 text-slate-500 hover:text-slate-300'}`}>
                              <div className="text-lg">{item.emoji}</div>
                              <div className="mt-0.5 text-[9px] font-bold">{item.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 4: Injuries & Safety ── */}
                {step === 4 && (
                  <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    {safetyGroups.map(group => {
                      const selected = (watch(group.field) ?? []) as string[];
                      return (
                        <fieldset key={group.field}>
                          <legend className={label}>{group.label}</legend>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => setValue(group.field as any, [], { shouldDirty: true })}
                              className={pill(selected.length === 0, false)}>
                              ✓ None
                            </button>
                            {group.options.map(opt => (
                              <button key={opt} type="button" onClick={() => toggleListValue(group.field, opt)}
                                className={pill(selected.includes(opt))}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      );
                    })}
                    <div>
                      <label className={label} htmlFor="ob-health-info">Anything else to note? <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                      <textarea id="ob-health-info" {...register('additionalHealthInfo')} rows={3} className={input} placeholder="Share relevant exercise considerations" />
                    </div>
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3">
                      <p className="text-xs leading-relaxed text-amber-200/70">⚠️ This is not a medical assessment. If you have pain, a medical condition, or recent surgery, consult a clinician before starting.</p>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 5: Lifestyle ── */}
                {step === 5 && (
                  <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label} htmlFor="ob-activity">Activity level</label>
                      <select id="ob-activity" {...register('activityLevel')} className={input}>
                        <option value="sedentary">Mostly sitting</option>
                        <option value="light">Lightly active</option>
                        <option value="moderate">Moderately active</option>
                        <option value="heavy">Very active</option>
                        <option value="athlete">Athlete</option>
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-job">Workday movement</label>
                      <select id="ob-job" {...register('jobType')} className={input}>
                        <option value="sitting">Mostly seated</option>
                        <option value="standing">Mostly standing</option>
                        <option value="physical">Physical work</option>
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-steps">Daily steps</label>
                      <input id="ob-steps" {...register('dailySteps', { valueAsNumber: true })} type="number" inputMode="numeric" step="500" className={input} placeholder="6000" />
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-sleep">Sleep (hours)</label>
                      <input id="ob-sleep" {...register('sleepHours', { valueAsNumber: true })} type="number" inputMode="decimal" min="0" max="24" step="0.5" className={input} />
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-stress">Stress level</label>
                      <select id="ob-stress" {...register('stressLevel')} className={input}>
                        <option value="low">Low</option>
                        <option value="medium">Moderate</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-water">Water goal (L)</label>
                      <input id="ob-water" {...register('dailyWaterIntakeLiters', { valueAsNumber: true })} type="number" inputMode="decimal" min="0.5" max="10" step="0.5" className={input} />
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-smoke">Do you smoke?</label>
                      <select id="ob-smoke" value={watch('smokingHabit') ? 'yes' : 'no'} onChange={e => setValue('smokingHabit', e.target.value === 'yes')} className={input}>
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-alcohol">Alcohol</label>
                      <select id="ob-alcohol" {...register('alcoholConsumption')} className={input}>
                        <option value="none">None</option>
                        <option value="light">Occasional</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Frequent</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={label} htmlFor="ob-occupation">Occupation <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                      <input id="ob-occupation" {...register('occupation')} className={input} placeholder="e.g. Student, Engineer" />
                    </div>
                  </motion.div>
                )}

                {/* ── Step 6: Food & Nutrition ── */}
                {step === 6 && (
                  <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label} htmlFor="ob-food-pref">Food preference</label>
                      <select id="ob-food-pref" {...register('foodPreference')} className={input}>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="jain">Jain</option>
                        <option value="eggetarian">Eggetarian</option>
                        <option value="non_veg">Non-vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-cuisine">Cuisine preference</label>
                      <select id="ob-cuisine" {...register('cuisinePreference')} className={input}>
                        <option value="indian">Indian</option>
                        <option value="north_indian">North Indian</option>
                        <option value="south_indian">South Indian</option>
                        <option value="gujarati">Gujarati</option>
                        <option value="punjabi">Punjabi</option>
                        <option value="continental">Continental</option>
                      </select>
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-country">Country</label>
                      <input id="ob-country" {...register('country')} autoComplete="country-name" className={input} placeholder="Country" />
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-meals">Meals per day</label>
                      <select id="ob-meals" {...register('numberOfMeals', { valueAsNumber: true })} className={input}>
                        {[2, 3, 4, 5, 6].map(m => <option key={m} value={m}>{m} meals</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className={label} htmlFor="ob-budget">Daily food budget <span className="normal-case tracking-normal text-slate-600">(local currency)</span></label>
                      <input id="ob-budget" {...register('dailyFoodBudget', { valueAsNumber: true, min: 0 })} type="number" inputMode="decimal" className={input} />
                    </div>
                    <div className="col-span-2">
                      <label className={label} htmlFor="ob-allergies">Allergies or foods to avoid</label>
                      <input id="ob-allergies" value={(watch('allergies') ?? []).join(', ')} onChange={e => updateTextList('allergies', e.target.value)} className={input} placeholder="Separate with commas" />
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-favorites">Foods you enjoy <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                      <input id="ob-favorites" value={(watch('favoriteFoods') ?? []).join(', ')} onChange={e => updateTextList('favoriteFoods', e.target.value)} className={input} placeholder="Oats, lentils, eggs" />
                    </div>
                    <div>
                      <label className={label} htmlFor="ob-dislikes">Foods you dislike <span className="normal-case tracking-normal text-slate-600">(optional)</span></label>
                      <input id="ob-dislikes" value={(watch('dislikedFoods') ?? []).join(', ')} onChange={e => updateTextList('dislikedFoods', e.target.value)} className={input} placeholder="Separate with commas" />
                    </div>
                  </motion.div>
                )}

                {/* ── Step 7: Schedule ── */}
                {step === 7 && (
                  <motion.div key="s7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {[
                        { id: 'ob-wake', field: 'wakeupTime', label: 'Wake-up time', emoji: '🌅' },
                        { id: 'ob-workout', field: 'workoutTime', label: 'Workout time', emoji: '🏋️' },
                        { id: 'ob-sleep', field: 'sleepTime', label: 'Bedtime', emoji: '🌙' },
                      ].map(t => (
                        <div key={t.field} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                          <div className="mb-2 text-2xl">{t.emoji}</div>
                          <label className={label} htmlFor={t.id}>{t.label}</label>
                          <input id={t.id} {...register(t.field as any)} type="time" className={input} />
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 p-4">
                      <p className="text-sm font-bold text-violet-200">✨ Almost there!</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">These times help us place workouts and meals around your routine. They don't need to be exact — you can update them anytime.</p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="mt-8 flex gap-3">
                {step > 1 && (
                  <button type="button" onClick={() => setStep(s => s - 1)}
                    className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-white/10">
                    <ChevronLeft className="h-4 w-4" /> Back
                  </button>
                )}
                {step < 7 ? (
                  <button type="button" onClick={handleContinue}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]">
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit"
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]">
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
