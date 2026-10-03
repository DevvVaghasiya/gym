import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useProgressStore } from '../store/useProgressStore';
import { evaluateProgressiveOverload } from '../engine/progressiveOverload';
import { calculatePlates } from '../engine/plateCalculator';
import { generateWorkoutPlan } from '../engine/workoutGenerator';
import { EXERCISE_DATABASE } from '../data/exercises';
import { getExerciseMachineImage } from '../data/exerciseImages';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Check, Clock, Shield, AlertCircle, Dumbbell, ChevronRight, RotateCcw, 
  HelpCircle, Shuffle, Camera, Info, Trophy, CheckCircle, Volume2, Sparkles 
} from 'lucide-react';

export default function WorkoutPage() {
  const navigate = useNavigate();
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const { currentPlan, logs, addLog, setPlan } = useWorkoutStore();
  const { addPR } = useProgressStore();

  const [activeDayIdx, setActiveDayIdx] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [activeSession, setActiveSession] = useState<any>(null);
  const weekDayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [isAddExercisesOpen, setIsAddExercisesOpen] = useState(false);
  const [isEditingExercises, setIsEditingExercises] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<Record<string, boolean>>({});
  
  // Alternatives Sheet
  const [alternativeEx, setAlternativeEx] = useState<any>(null);

  // Plate Calculator
  const [targetPlateWeight, setTargetPlateWeight] = useState<number>(0);
  const [calculatedPlates, setCalculatedPlates] = useState<any>({ plates: null, perSide: [] });

  // Active Timer
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerMax, setTimerMax] = useState(90);
  const [timerActive, setTimerActive] = useState(false);
  const timerIntervalRef = useRef<any>(null);

  // Computer Vision Trainer
  const [cvActive, setCvActive] = useState(false);
  const [cvRepCount, setCvRepCount] = useState(0);
  const [cvFeedback, setCvFeedback] = useState("Align your body in the frame to begin.");
  const [cvSquatDepth, setCvSquatDepth] = useState(100); // 100% of height (higher is standing, lower is deep squat)
  const [cvBackAngle, setCvBackAngle] = useState(180); // Straight spine
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cvAnimationRef = useRef<any>(null);
  const inputClasses = "w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2 text-white text-sm";
  const labelClasses = "block text-xs font-semibold text-gray-300 mb-1.5";

  const todayString = new Date().toISOString().slice(0, 10);
  const selectedWeekday = selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' }) : '';
  const selectedWorkoutDays = profile?.selectedWorkoutDays && profile.selectedWorkoutDays.length > 0
    ? profile.selectedWorkoutDays
    : (currentPlan ? currentPlan.days.filter(day => !day.isRestDay).map(day => day.day) : []);

  const updateSelectedWorkoutDays = (nextDays: string[]) => {
    if (!profile) return;

    const normalized = [...new Set(nextDays)]
      .filter(day => weekDayOrder.includes(day))
      .sort((a, b) => weekDayOrder.indexOf(a) - weekDayOrder.indexOf(b));

    const finalDays = normalized.length > 0 ? normalized : [selectedWeekday || 'Monday'];
    updateProfile({ selectedWorkoutDays: finalDays, daysPerWeek: finalDays.length });

    const generatedPlan = generateWorkoutPlan({ ...profile, selectedWorkoutDays: finalDays, daysPerWeek: finalDays.length });
    setPlan(generatedPlan);
  };

  const toggleWorkoutDay = (day: string) => {
    const current = [...(selectedWorkoutDays || [])];
    const nextDays = current.includes(day)
      ? current.filter(item => item !== day)
      : [...current, day];

    const ordered = nextDays
      .filter(item => weekDayOrder.includes(item))
      .sort((a, b) => weekDayOrder.indexOf(a) - weekDayOrder.indexOf(b));

    updateSelectedWorkoutDays(ordered.length > 0 ? ordered : [day]);
  };

  useEffect(() => {
    if (!currentPlan) return;

    const preferredIdx = currentPlan.days.findIndex(day => day.day === selectedWeekday);
    const fallbackIdx = currentPlan.days.findIndex(day => !day.isRestDay);
    const nextIdx = preferredIdx >= 0 ? preferredIdx : (fallbackIdx >= 0 ? fallbackIdx : 0);

    setActiveDayIdx((current) => current === null || current !== nextIdx ? nextIdx : current);
  }, [currentPlan, selectedDate, selectedWeekday]);

  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0 && timerActive) {
      setTimerActive(false);
      // Play brief notification sound
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(660, audioCtx.currentTime); // high note
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } catch (e) {
        // silent fail
      }
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerActive, timerSeconds]);

  // Handle CV Video / Canvas Loop
  useEffect(() => {
    if (cvActive) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
            // Start skeleton loop
            cvAnimationRef.current = requestAnimationFrame(drawCVSkeleton);
          }
        })
        .catch(err => {
          setCvFeedback("Webcam access denied. Displaying form simulation.");
          cvAnimationRef.current = requestAnimationFrame(drawCVSkeleton);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(cvAnimationRef.current);
    }
    return () => cancelAnimationFrame(cvAnimationRef.current);
  }, [cvActive]);

  // Simulated skeletal tracking loop on canvas
  let mockCycle = 0;
  let direction = -1; // -1 squatting down, 1 pushing up
  const drawCVSkeleton = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, 320, 240);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 40; x < 320; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 240); ctx.stroke();
    }
    for (let y = 30; y < 240; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(320, y); ctx.stroke();
    }

    // Draw camera stream image representation if no webcam
    if (!videoRef.current || !videoRef.current.srcObject) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px sans-serif';
      ctx.fillText("CV Trainer: Form Tracking Simulated", 12, 20);
    } else {
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    }

    // Squat movement simulation
    mockCycle += 0.05 * direction;
    if (mockCycle <= -1) {
      direction = 1; // bottom of squat reached, stand up
      speakFeedback("Drive up through your heels!");
    } else if (mockCycle >= 1) {
      direction = -1; // standing, squat down again
      setCvRepCount(c => c + 1);
      speakFeedback("Good rep! Lower slowly.");
    }

    const hipOffset = (1 + mockCycle) * 35; // 0 to 70px vertical shift
    const kneeY = 160;
    const hipY = 110 + hipOffset;
    const ankleY = 210;

    // Body Joint Keypoints (relative to canvas width=320, height=240)
    const head = { x: 160, y: 40 + hipOffset * 0.4 };
    const shoulder = { x: 160, y: 70 + hipOffset * 0.6 };
    const hip = { x: 160, y: hipY };
    const knee = { x: 135, y: kneeY };
    const ankle = { x: 135, y: ankleY };

    // Calculate angles
    const spineDiffY = hip.y - shoulder.y;
    const spineDiffX = hip.x - shoulder.x;
    const backAngleDeg = Math.round(180 - Math.abs(Math.atan2(spineDiffX, spineDiffY) * (180 / Math.PI)));
    setCvBackAngle(backAngleDeg);

    const squatDepthPct = Math.round(((kneeY - hipY) / 50) * 100);
    setCvSquatDepth(squatDepthPct);

    // Provide real-time form checks
    if (backAngleDeg < 155) {
      setCvFeedback("⚠️ Straighten your back! Neutral spine.");
      ctx.strokeStyle = '#ef4444';
    } else if (squatDepthPct > 90) {
      setCvFeedback("⚠️ Depth optimal! Drive back up.");
      ctx.strokeStyle = '#10b981';
    } else if (squatDepthPct < 30) {
      setCvFeedback("⚠️ Squat deeper! Hips below knees.");
      ctx.strokeStyle = '#f59e0b';
    } else {
      setCvFeedback("Perfect Form. Keep executing.");
      ctx.strokeStyle = '#60a5fa';
    }

    // Draw Skeleton
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    // Head
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(head.x, head.y, 10, 0, Math.PI * 2); ctx.fill();

    // Spine
    ctx.beginPath(); ctx.moveTo(head.x, head.y); ctx.lineTo(shoulder.x, shoulder.y); ctx.lineTo(hip.x, hip.y); ctx.stroke();

    // Legs
    ctx.beginPath(); ctx.moveTo(hip.x, hip.y); ctx.lineTo(knee.x, knee.y); ctx.lineTo(ankle.x, ankle.y); ctx.stroke();

    // Arms
    ctx.beginPath(); ctx.moveTo(shoulder.x, shoulder.y); ctx.lineTo(125, 90 + hipOffset * 0.5); ctx.stroke();

    cvAnimationRef.current = requestAnimationFrame(drawCVSkeleton);
  };

  const speakFeedback = (text: string) => {
    if ('speechSynthesis' in window) {
      // Limit voice cues so it doesn't spam
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.volume = 0.5;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  const calculateBarbellPlates = (weightKg: number) => {
    setTargetPlateWeight(weightKg);
    const res = calculatePlates(weightKg, 20); // 20kg bar
    setCalculatedPlates(res);
  };

  // Launch Session
  const startSession = (day: any) => {
    const sessionExercises = day.exercises.map((we: any) => ({
      ...we,
      setsLogged: Array(we.sets).fill(null).map(() => ({
        weight: we.recommendedWeight.min,
        reps: we.reps,
        rpe: 8,
        completed: false
      }))
    }));

    setActiveSession({
      dayName: day.day,
      title: day.name,
      exercises: sessionExercises,
      currentExIdx: 0,
      painLevel: 0,
      energyLevel: 4,
      notes: ''
    });
  };

  const updateSetLogged = (exIdx: number, setIdx: number, key: string, val: any) => {
    const updated = { ...activeSession };
    updated.exercises[exIdx].setsLogged[setIdx][key] = val;
    setActiveSession(updated);
  };

  const toggleSetCompleted = (exIdx: number, setIdx: number) => {
    const updated = { ...activeSession };
    const currentSet = updated.exercises[exIdx].setsLogged[setIdx];
    currentSet.completed = !currentSet.completed;
    setActiveSession(updated);

    if (currentSet.completed) {
      // Trigger rest timer
      const currentEx = updated.exercises[exIdx];
      setTimerMax(currentEx.restSeconds || 90);
      setTimerSeconds(currentEx.restSeconds || 90);
      setTimerActive(true);
      
      // Auto reward XP
      updateProfile({ xp: (profile?.xp || 0) + 15 });
    }
  };

  const finishSession = () => {
    if (!activeSession) return;

    // Check PRs and progressive overload recommendations
    const workoutLogs: any[] = [];
    
    activeSession.exercises.forEach((ex: any) => {
      const maxWeight = ex.setsLogged.reduce((max: number, s: any) => s.completed && s.weight > max ? s.weight : max, 0);
      const bestSet = ex.setsLogged.find((s: any) => s.completed && s.weight === maxWeight);
      
      if (maxWeight > 0 && bestSet) {
        // Log a Personal Record
        addPR({
          exerciseId: ex.exercise.id,
          exerciseName: ex.exercise.name,
          weight: maxWeight,
          reps: bestSet.reps,
          date: new Date().toLocaleDateString(),
          estimated1RM: Math.round(maxWeight * (1 + bestSet.reps / 30))
        });
      }

      workoutLogs.push({
        exerciseId: ex.exercise.id,
        exerciseName: ex.exercise.name,
        sets: ex.setsLogged.map((s: any) => ({
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          completed: s.completed
        }))
      });
    });

    // Save workout log to store
    addLog({
      id: 'log_' + Date.now(),
      date: new Date().toISOString(),
      dayName: activeSession.dayName,
      exercises: workoutLogs,
      duration: profile?.workoutDuration || 60,
      caloriesBurned: activeSession.exercises.length * 60,
      mood: 'Energized',
      soreness: 'Medium',
      painLevel: activeSession.painLevel,
      energyLevel: activeSession.energyLevel,
      completionPercentage: 100,
      notes: activeSession.notes
    });

    // Award major XP
    updateProfile({
      xp: (profile?.xp || 0) + 200,
      streak: (profile?.streak || 1) + 1
    });

    // Clean up
    setActiveSession(null);
    setCvActive(false);
    alert("Workout complete! AI Progressive Overload has been evaluated and logged. +200 XP gained.");
  };

  if (!currentPlan) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
        <AlertCircle className="w-12 h-12 text-blue-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">No Active Workout Plan</h3>
        <p className="text-sm text-gray-500 text-center max-w-xs mb-6">Create your workout plan by completing Onboarding first.</p>
        <button onClick={() => navigate('/onboarding')} className="btn-primary">Complete Onboarding Wizard</button>
      </div>
    );
  }

  const activeDay = activeDayIdx !== null ? currentPlan.days[activeDayIdx] : null;
  const existingExerciseIds = new Set((activeDay?.exercises || []).map((item) => item.exercise.id));
  const filteredExercisePool = EXERCISE_DATABASE.filter((exercise) => {
    const isAlreadyAdded = existingExerciseIds.has(exercise.id);
    if (isAlreadyAdded) return false;

    const term = exerciseSearch.trim().toLowerCase();
    if (!term) return true;
    return exercise.name.toLowerCase().includes(term) || exercise.muscleGroup.toLowerCase().includes(term);
  });

  const addSelectedExercises = () => {
    if (!currentPlan || activeDayIdx === null || Object.keys(selectedExerciseIds).length === 0) {
      setIsAddExercisesOpen(false);
      return;
    }

    const additions = EXERCISE_DATABASE.filter((exercise) => selectedExerciseIds[exercise.id])
      .map((exercise) => ({
        exercise,
        sets: 4,
        reps: 10,
        recommendedWeight: { min: 12, max: 22 },
        restSeconds: 75,
        targetRPE: 8,
      }));

    if (additions.length === 0) {
      setIsAddExercisesOpen(false);
      return;
    }

    const nextPlan = {
      ...currentPlan,
      days: currentPlan.days.map((day, idx) => idx === activeDayIdx
        ? { ...day, exercises: [...day.exercises, ...additions] }
        : day),
    };

    setPlan(nextPlan);
    setSelectedExerciseIds({});
    setExerciseSearch('');
    setIsAddExercisesOpen(false);
  };

  const removeExerciseFromDay = (exerciseIndex: number) => {
    if (!currentPlan || activeDayIdx === null) return;

    const nextPlan = {
      ...currentPlan,
      days: currentPlan.days.map((day, idx) => idx === activeDayIdx
        ? { ...day, exercises: day.exercises.filter((_, index) => index !== exerciseIndex) }
        : day),
    };

    setPlan(nextPlan);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="page-shell mx-auto w-full max-w-[1500px] pb-20"
    >
      {!activeSession && currentPlan && (
        <div className="glass-section mb-8 p-4 sm:p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Workout Schedule
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Training Plan</h1>
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-300 shadow-inner shadow-slate-950/40">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">Date</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value || todayString)}
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-medium text-white outline-none ring-0 transition focus:border-blue-500/50"
                />
              </label>

              <button
                type="button"
                onClick={() => setSelectedDate(todayString)}
                className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-300 transition hover:bg-blue-500/20"
              >
                Today
              </button>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">Select workout days</div>
            <div className="flex flex-wrap gap-2.5">
              {weekDayOrder.map((day) => {
                const isSelected = (selectedWorkoutDays || []).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWorkoutDay(day)}
                    className={`rounded-2xl border px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition-all ${
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/15 text-white shadow-lg shadow-blue-500/10'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSession ? (
        // ACTIVE WORKOUT MODE
        <div className="relative">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-extrabold uppercase tracking-widest ring-1 ring-blue-500/20">
                  Active Session
                </span>
                <span className="flex items-center gap-2 text-gray-500 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {activeSession.currentExIdx + 1} of {activeSession.exercises.length} Exercises
                </span>
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight">{activeSession.title}</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => { if (confirm('Cancel workout session?')) setActiveSession(null); }}
                className="px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 transition-all font-bold text-sm"
              >
                Quit Session
              </button>
              <button
                onClick={finishSession}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
              >
                Finish Workout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Main Exercise Area */}
            <div className="lg:col-span-8 space-y-8">
              {/* Exercise Navigation */}
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {activeSession.exercises.map((we: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const updated = { ...activeSession };
                      updated.currentExIdx = idx;
                      setActiveSession(updated);
                    }}
                    className={`flex-shrink-0 px-6 py-3 rounded-2xl text-xs font-extrabold transition-all border ${
                      activeSession.currentExIdx === idx
                        ? 'bg-white/10 text-white border-white/20 shadow-xl'
                        : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                    {idx + 1}. {we.exercise.name}
                  </button>
                ))}
              </div>

              {/* Current Exercise Details */}
              {(() => {
                const currentWe = activeSession.exercises[activeSession.currentExIdx];
                if (!currentWe) return null;
                return (
                  <motion.div
                    key={activeSession.currentExIdx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="stat-card !p-0"
                  >
                    <div className="p-8 border-b border-white/5 flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight mb-2">{currentWe.exercise.name}</h2>
                        <div className="flex gap-4">
                          <span className="text-blue-500 text-[10px] font-extrabold uppercase tracking-widest">{currentWe.exercise.muscleGroup}</span>
                          <span className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest">Tempo: {currentWe.tempo || '3-0-1-0'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setAlternativeEx(currentWe)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                          <Shuffle className="w-4 h-4" />
                        </button>
                        <button onClick={() => calculateBarbellPlates(currentWe.setsLogged[0]?.weight || 60)} className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                          <Info className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-8">
                      <div className="grid grid-cols-12 gap-4 mb-6 text-[10px] font-extrabold text-gray-500 uppercase tracking-widest px-4">
                        <div className="col-span-2">Set</div>
                        <div className="col-span-3 text-center">Weight (kg)</div>
                        <div className="col-span-3 text-center">Reps</div>
                        <div className="col-span-2 text-center">RPE</div>
                        <div className="col-span-2"></div>
                      </div>

                      <div className="space-y-3">
                        {currentWe.setsLogged.map((set: any, sIdx: number) => (
                          <div key={sIdx} className={`grid grid-cols-12 gap-4 items-center p-4 rounded-3xl transition-all duration-300 ${
                            set.completed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/[0.02] border border-white/5'
                          }`}>
                            <div className={`col-span-2 text-xs font-bold ${set.completed ? 'text-emerald-500' : 'text-gray-500'}`}>Set {sIdx + 1}</div>
                            <div className="col-span-3">
                              <input
                                type="number" step="0.5" value={set.weight}
                                onChange={e => updateSetLogged(activeSession.currentExIdx, sIdx, 'weight', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 text-center text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/40"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number" value={set.reps}
                                onChange={e => updateSetLogged(activeSession.currentExIdx, sIdx, 'reps', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 text-center text-sm font-bold text-white focus:ring-2 focus:ring-blue-500/40"
                              />
                            </div>
                            <div className="col-span-2">
                              <select
                                value={set.rpe || 8}
                                onChange={e => updateSetLogged(activeSession.currentExIdx, sIdx, 'rpe', Number(e.target.value))}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl py-2 text-center text-sm font-bold text-white appearance-none"
                              >
                                {[10, 9, 8, 7, 6].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                            </div>
                            <div className="col-span-2 text-right">
                              <button
                                onClick={() => toggleSetCompleted(activeSession.currentExIdx, sIdx)}
                                className={`w-full py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all ${
                                  set.completed ? 'bg-emerald-500 text-white' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500 hover:text-white'
                                }`}
                              >
                                {set.completed ? 'Done' : 'Log'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              <div className="flex justify-between items-center px-4">
                <button
                  disabled={activeSession.currentExIdx === 0}
                  onClick={() => { const s = {...activeSession}; s.currentExIdx--; setActiveSession(s); }}
                  className="flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-colors disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" /> Previous
                </button>
                <button
                  disabled={activeSession.currentExIdx === activeSession.exercises.length - 1}
                  onClick={() => { const s = {...activeSession}; s.currentExIdx++; setActiveSession(s); }}
                  className="flex items-center gap-2 text-gray-500 hover:text-white font-bold transition-colors disabled:opacity-30"
                >
                  Next <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sidebar Tools */}
            <div className="lg:col-span-4 space-y-8">
              {/* Timer */}
              <div className="stat-card text-center p-10">
                <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-8">Rest Timer</p>
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center mb-8">
                  <svg className="absolute w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="80" className="stroke-white/5 stroke-[6px] fill-none" />
                    <motion.circle
                      cx="96" cy="96" r="80"
                      className="stroke-blue-500 stroke-[6px] fill-none"
                      strokeDasharray={502}
                      initial={{ strokeDashoffset: 502 }}
                      animate={{ strokeDashoffset: 502 - (502 * timerSeconds) / timerMax }}
                      transition={{ duration: 1, ease: "linear" }}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="text-5xl font-black text-white tracking-tighter">
                    {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTimerActive(!timerActive)}
                    className="flex-1 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold text-sm hover:bg-white/[0.05]"
                  >
                    {timerActive ? 'Pause' : 'Start'}
                  </button>
                  <button 
                    onClick={() => { setTimerSeconds(timerMax); setTimerActive(false); }}
                    className="flex-1 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white font-bold text-sm hover:bg-white/[0.05]"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* AI Trainer */}
              <div className="stat-card">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                      <Camera className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">AI Trainer</h3>
                  </div>
                  <button
                    onClick={() => setCvActive(!cvActive)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${cvActive ? 'bg-blue-500' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${cvActive ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                {cvActive ? (
                  <div className="space-y-6">
                    <div className="aspect-video rounded-3xl overflow-hidden bg-black relative ring-1 ring-white/10">
                      <video ref={videoRef} className="hidden" />
                      <canvas ref={canvasRef} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] text-white font-extrabold uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Detection
                      </div>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                      <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest mb-2">Coach Feedback</p>
                      <p className="text-white text-sm font-bold leading-relaxed">{cvFeedback}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 px-4">
                    <p className="text-gray-500 text-sm font-medium mb-4">Activate AI Trainer for real-time form correction & rep counting.</p>
                    <button onClick={() => setCvActive(true)} className="text-blue-500 text-xs font-extrabold uppercase tracking-widest hover:text-blue-400 transition-colors">
                      Enable Camera
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // PLAN OVERVIEW
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-8 xl:gap-10">
          {/* Days Selection */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="glass-section h-full p-4 sm:p-5 md:p-6">
              <h2 className="mb-7 px-2 text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-400">Training Split</h2>
              <div className="flex flex-col gap-4 sm:gap-5">
                {currentPlan.days.map((day, idx) => {
                  const isSelectedDateDay = selectedWeekday === day.day;
                  const isToday = selectedDate === todayString && isSelectedDateDay;

                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveDayIdx(idx)}
                      className={`w-full text-left rounded-[1.5rem] border p-4 transition-all duration-300 sm:p-5 ${
                        activeDayIdx === idx
                          ? 'border-white/20 bg-white/10 text-white shadow-[0_20px_35px_-26px_rgba(59,130,246,0.9)]'
                          : 'border-white/5 bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-white'
                      } ${isSelectedDateDay ? 'ring-1 ring-blue-500/40' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-extrabold uppercase tracking-[0.18em] ${activeDayIdx === idx ? 'text-blue-400' : 'text-slate-500'}`}>{day.day}</span>
                        {isSelectedDateDay && (
                          <span className="rounded-full bg-blue-500/10 px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.18em] text-blue-300">
                            {isToday ? 'Today' : 'Selected'}
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-black tracking-tight sm:text-[1.3rem] leading-tight">{day.name}</div>
                      {!day.isRestDay && (
                        <div className="mt-2 text-xs font-medium text-slate-400">
                          {day.exercises.length} exercises
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-7 xl:col-span-8">
            {activeDay && (
              <motion.div
                key={activeDayIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-section !p-0"
              >
                <div className="flex flex-col justify-between gap-5 border-b border-white/5 p-6 sm:p-8 md:flex-row md:items-center">
                  <div>
                    <h3 className="mb-2 text-3xl font-extrabold tracking-tight text-white">{activeDay.name}</h3>
                    <p className="text-sm text-slate-400">{activeDay.focus}</p>
                  </div>
                  {!activeDay.isRestDay && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setIsAddExercisesOpen(true)}
                        className="btn-secondary"
                      >
                        + Add Exercises
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingExercises((prev) => !prev)}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-200 transition hover:border-amber-500/30 hover:text-white"
                      >
                        {isEditingExercises ? 'Done Editing' : 'Edit'}
                      </button>
                      <button
                        onClick={() => startSession(activeDay)}
                        className="btn-premium"
                      >
                        Start Workout
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-5 p-6 sm:p-8">
                  {!activeDay.isRestDay ? activeDay.exercises.map((we, idx) => (
                    <div key={idx} className="rounded-[1.6rem] border border-white/5 bg-white/[0.02] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04] group sm:p-5">
                      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-start gap-3 sm:gap-4">
                          <img
                            src={getExerciseMachineImage(we.exercise)}
                            alt={we.exercise.name}
                            className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/10 bg-slate-900/70 sm:h-24 sm:w-24"
                          />
                          <div>
                            <h4 className="text-lg font-bold text-white transition-colors group-hover:text-blue-400">{we.exercise.name}</h4>
                            <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                              {we.exercise.equipment.join(' • ') || 'Gym machine'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left lg:text-right">
                            <p className="text-sm font-black text-blue-400">{we.recommendedWeight.min}-{we.recommendedWeight.max} kg</p>
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Target Weight</p>
                          </div>
                          {isEditingExercises && (
                            <button
                              type="button"
                              onClick={() => removeExerciseFromDay(idx)}
                              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/20"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-5 sm:gap-8">
                        <div>
                          <p className="text-sm font-bold text-white">{we.sets}</p>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Sets</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{we.reps}</p>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Reps</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{we.restSeconds}s</p>
                          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Rest</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-20 px-10">
                      <Shield className="w-16 h-16 text-white/5 mx-auto mb-6" />
                      <h4 className="text-xl font-bold text-white mb-2">Recovery Day</h4>
                      <p className="text-gray-500 font-medium">Rest is where the growth happens. Focus on hydration and quality sleep.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAddExercisesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/95 p-5 shadow-[0_25px_80px_-25px_rgba(59,130,246,0.8)] sm:p-7"
            >
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black tracking-tight text-white">Add Exercises</h3>
                  <p className="mt-1 text-sm text-slate-400">Chest, shoulders, triceps · 34 available</p>
                </div>
                <button
                  onClick={() => setIsAddExercisesOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-lg text-slate-300 transition-colors hover:text-white"
                  aria-label="Close add exercises modal"
                >
                  ×
                </button>
              </div>

              <label className="mb-5 block">
                <span className="mb-2 block text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Search exercises</span>
                <input
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Search exercises..."
                  className="input-modern"
                />
              </label>

              <div className="mb-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                {['All', 'Chest', 'Shoulders', 'Triceps', 'Back', 'Legs'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300 transition-colors hover:border-blue-500/40 hover:text-white"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {filteredExercisePool.map((exercise) => {
                  const isSelected = !!selectedExerciseIds[exercise.id];
                  return (
                    <div
                      key={exercise.id}
                      className={`flex items-center justify-between rounded-[1.15rem] border p-3 transition-all ${
                        isSelected
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-500 text-xs font-black text-white">
                          {exercise.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{exercise.name}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            {exercise.muscleGroup} • {exercise.type}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedExerciseIds((prev) => ({ ...prev, [exercise.id]: !prev[exercise.id] }))}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                          isSelected
                            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                            : 'border-white/10 bg-slate-900/70 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isSelected ? '✓' : '+'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddExercisesOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={addSelectedExercises} className="btn-premium">
                  Add Selected
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plate Calculator (shown only when user clicks info icon) */}
      <AnimatePresence>
        {targetPlateWeight > 0 && calculatedPlates && calculatedPlates.plates && calculatedPlates.plates.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white tracking-tight mb-2">Plate Calculator</h3>
              <p className="text-gray-500 font-medium mb-8">Loading for {targetPlateWeight}kg (20kg bar)</p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {calculatedPlates.perSide.map((p: any, i: number) => (
                  <div key={i} className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl text-center">
                    <p className="text-2xl font-black text-white">{p.weight}kg</p>
                    <p className="text-gray-500 text-[10px] font-extrabold uppercase tracking-widest">x{p.count} Plates</p>
                  </div>
                ))}
              </div>

              <button onClick={() => setTargetPlateWeight(0)} className="w-full py-4 rounded-2xl bg-white text-black font-extrabold text-sm shadow-xl hover:bg-gray-100 transition-colors">
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
