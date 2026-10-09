import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { generateWorkoutPlan } from '../engine/workoutGenerator';
import { generateAIDietPlan } from '../engine/dietGenerator';
import { useNutritionStore } from '../store/useNutritionStore';
import { useProgressStore } from '../store/useProgressStore';
import { useNavigate } from 'react-router-dom';
import {
  User, Dumbbell, Utensils, Sliders,
  Check, LogOut, Camera, Save, Download, RefreshCw, Trash2
} from 'lucide-react';

const inputStyle =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all';
const labelStyle =
  'block text-xs font-semibold text-slate-300 mb-2';

export default function SettingsPage() {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const setProfile = useUserStore(state => state.setProfile);
  const logout = useAuthStore(state => state.logout);
  const setWorkoutPlan = useWorkoutStore(state => state.setPlan);
  const setDietPlan = useNutritionStore(state => state.setPlan);
  const { entries, prs } = useProgressStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'workout' | 'nutrition' | 'preferences'>('profile');
  const [form, setForm] = useState<any>({});
  const [savedMsg, setSavedMsg] = useState('');

  // Notification & Preference toggles
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [waterReminders, setWaterReminders] = useState(true);

  useEffect(() => {
    if (profile) setForm({ ...profile });
  }, [profile]);

  const handleSaveSettings = () => {
    if (!profile) return;
    updateProfile(form);

    const newWorkoutPlan = generateWorkoutPlan({ ...profile, ...form });
    setWorkoutPlan(newWorkoutPlan);

    const newDietPlan = generateAIDietPlan({ ...profile, ...form });
    setDietPlan(newDietPlan);

    setSavedMsg('Settings saved successfully!');
    setTimeout(() => setSavedMsg(''), 3500);
  };

  const handleUploadAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      updateProfile({ avatar: url });
      setForm((prev: any) => ({ ...prev, avatar: url }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetData = () => {
    if (!confirm('Re-run onboarding wizard to recalculate your fitness baseline?')) return;
    navigate('/onboarding');
  };

  const handleDeleteAccount = () => {
    if (!confirm('Are you sure you want to delete your profile data and sign out?')) return;
    setProfile(null as any);
    logout();
  };

  const handleExportData = () => {
    if (!profile) return;
    const recoveryScore = profile.sleepHours >= 8 ? 88 : profile.sleepHours >= 7 ? 74 : 52;
    let csv = 'date,goal,sleep_hours,recovery_score,weight_kg,recent_pr_exercise,recent_pr_weight\n';
    entries.forEach(entry => {
      const recentPR = prs.find(p => p.date === entry.date) || prs[prs.length - 1] || null;
      csv += `${entry.date},${profile.goal},${profile.sleepHours},${recoveryScore},${entry.weightKg},${recentPR ? recentPR.exerciseName : 'none'},${recentPR ? recentPR.weight : 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitai_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setSavedMsg('Data exported successfully!');
    setTimeout(() => setSavedMsg(''), 3500);
  };

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center font-bold text-slate-400">
        Loading settings...
      </div>
    );
  }

  const navTabs = [
    { id: 'profile', label: 'Body Biometrics & Profile', desc: 'Weight, height, age, targets', icon: User },
    { id: 'workout', label: 'Workout & Training Rules', desc: 'Split, frequency, gym setup', icon: Dumbbell },
    { id: 'nutrition', label: 'Diet & Nutrition Preferences', desc: 'Meals, water goal, diet type', icon: Utensils },
    { id: 'preferences', label: 'App Theme & Notifications', desc: 'Sound, alerts, data export', icon: Sliders },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-6xl space-y-6 pb-24 font-sans px-2 sm:px-4"
    >
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">App Settings</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Customize your biometrics, workout preferences, diet goals and app behavior.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20 transition-all hover:bg-violet-500 active:scale-[0.99]"
          >
            <Save className="h-4 w-4" /> Save Changes
          </button>
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition-all hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-300"
          >
            <LogOut className="h-4 w-4 text-rose-400" /> Sign Out
          </button>
        </div>
      </header>

      {/* Save Notification Toast */}
      <AnimatePresence>
        {savedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-xs font-bold text-emerald-300 shadow-xl"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{savedMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Profile Sidebar & Navigation */}
        <div className="space-y-6 lg:col-span-4">
          {/* User Profile Card */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-center backdrop-blur-2xl">
            <div className="group relative mx-auto mb-4 h-20 w-20">
              <div className="h-full w-full rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 p-1 shadow-xl">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-slate-950">
                  {form.avatar ? (
                    <img src={form.avatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-white">{form.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              </div>
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
                <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" />
              </label>
            </div>

            <h3 className="text-base font-extrabold text-white truncate">{form.name || 'User'}</h3>
            <p className="text-xs text-slate-400 truncate mb-4">{form.email || 'user@example.com'}</p>

            <div className="grid grid-cols-2 gap-2 border-t border-white/8 pt-4 text-left">
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Current</span>
                <span className="text-sm font-extrabold text-white">{form.weightKg || 70} kg</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Target</span>
                <span className="text-sm font-extrabold text-violet-400">{form.goalWeightKg || 70} kg</span>
              </div>
            </div>
          </div>

          {/* Navigation Tab Pills */}
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-2.5 backdrop-blur-2xl space-y-1">
            {navTabs.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${
                    active
                      ? 'bg-violet-600/15 border border-violet-500/30 text-white shadow-sm'
                      : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    active ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-400'
                  }`}>
                    <tab.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${active ? 'text-white' : 'text-slate-300'}`}>
                      {tab.label}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Tab Content Card */}
        <div className="lg:col-span-8">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-2xl space-y-6">
            
            {/* TAB 1: Profile & Biometrics */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="border-b border-white/8 pb-4">
                  <h3 className="text-lg font-black text-white">Body Biometrics</h3>
                  <p className="text-xs text-slate-400">Keep your physiological metrics up to date for precise AI targets.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Full Name</label>
                    <input
                      type="text" className={inputStyle} value={form.name || ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Email Address</label>
                    <input
                      type="email" className={inputStyle} value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Age (Years)</label>
                    <input
                      type="number" className={inputStyle} value={form.age || 26}
                      onChange={e => setForm({ ...form, age: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Height (cm)</label>
                    <input
                      type="number" className={inputStyle} value={form.heightCm || 178}
                      onChange={e => setForm({ ...form, heightCm: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Current Weight (kg)</label>
                    <input
                      type="number" step="0.5" className={inputStyle} value={form.weightKg || 74}
                      onChange={e => setForm({ ...form, weightKg: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Goal Weight (kg)</label>
                    <input
                      type="number" step="0.5" className={inputStyle} value={form.goalWeightKg || 70}
                      onChange={e => setForm({ ...form, goalWeightKg: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Primary Goal</label>
                    <select
                      className={inputStyle} value={form.goal || 'recomposition'}
                      onChange={e => setForm({ ...form, goal: e.target.value })}
                    >
                      <option value="weight_loss">Weight Loss / Fat Loss</option>
                      <option value="muscle_gain">Build Muscle / Hypertrophy</option>
                      <option value="recomposition">Body Recomposition</option>
                      <option value="strength">Strength & Power</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Activity Level</label>
                    <select
                      className={inputStyle} value={form.activityLevel || 'moderate'}
                      onChange={e => setForm({ ...form, activityLevel: e.target.value })}
                    >
                      <option value="sedentary">Sedentary (Desk Job)</option>
                      <option value="light">Lightly Active</option>
                      <option value="moderate">Moderately Active</option>
                      <option value="heavy">Very Active</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Workout Rules */}
            {activeTab === 'workout' && (
              <div className="space-y-6">
                <div className="border-b border-white/8 pb-4">
                  <h3 className="text-lg font-black text-white">Workout & Training Rules</h3>
                  <p className="text-xs text-slate-400">Configure your training frequency, session duration, and available gym type.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Training Experience</label>
                    <select
                      className={inputStyle} value={form.experience || 'beginner'}
                      onChange={e => setForm({ ...form, experience: e.target.value })}
                    >
                      <option value="beginner">Beginner (0 - 1 year)</option>
                      <option value="intermediate">Intermediate (1 - 3 years)</option>
                      <option value="advanced">Advanced (3+ years)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Workout Days per Week</label>
                    <select
                      className={inputStyle} value={form.daysPerWeek || 4}
                      onChange={e => setForm({ ...form, daysPerWeek: Number(e.target.value) })}
                    >
                      <option value={3}>3 Days / Week</option>
                      <option value={4}>4 Days / Week</option>
                      <option value={5}>5 Days / Week</option>
                      <option value={6}>6 Days / Week</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Session Duration</label>
                    <select
                      className={inputStyle} value={form.workoutDuration || 60}
                      onChange={e => setForm({ ...form, workoutDuration: Number(e.target.value) })}
                    >
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                      <option value={75}>75 Minutes</option>
                      <option value={90}>90 Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Gym Environment</label>
                    <select
                      className={inputStyle} value={form.gymType || 'commercial'}
                      onChange={e => setForm({ ...form, gymType: e.target.value })}
                    >
                      <option value="commercial">Commercial Gym (Full Equipment)</option>
                      <option value="home">Home Gym (Dumbbells & Bands)</option>
                      <option value="bodyweight">Calisthenics (Bodyweight Only)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Diet & Nutrition */}
            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                <div className="border-b border-white/8 pb-4">
                  <h3 className="text-lg font-black text-white">Diet & Hydration Targets</h3>
                  <p className="text-xs text-slate-400">Configure dietary preference, water intake, and daily meals count.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Dietary Preference</label>
                    <select
                      className={inputStyle} value={form.foodPreference || 'vegetarian'}
                      onChange={e => setForm({ ...form, foodPreference: e.target.value })}
                    >
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non_veg">Non-Vegetarian</option>
                      <option value="eggetarian">Eggetarian</option>
                      <option value="vegan">Vegan</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Daily Water Goal (Liters)</label>
                    <input
                      type="number" step="0.5" className={inputStyle} value={form.dailyWaterIntakeLiters || 3.0}
                      onChange={e => setForm({ ...form, dailyWaterIntakeLiters: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelStyle}>Meals Per Day</label>
                    <select
                      className={inputStyle} value={form.numberOfMeals || 4}
                      onChange={e => setForm({ ...form, numberOfMeals: Number(e.target.value) })}
                    >
                      <option value={3}>3 Meals</option>
                      <option value={4}>4 Meals</option>
                      <option value={5}>5 Meals</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelStyle}>Sleep Target (Hours)</label>
                    <input
                      type="number" step="0.5" className={inputStyle} value={form.sleepHours || 8}
                      onChange={e => setForm({ ...form, sleepHours: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Preferences & Account */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="border-b border-white/8 pb-4">
                  <h3 className="text-lg font-black text-white">Preferences & Account Management</h3>
                  <p className="text-xs text-slate-400">Control notifications, export metrics, or manage account data.</p>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  {[
                    { title: 'Rest Timer Audio Beeps', desc: 'Audio cue when workout rest interval ends', state: soundEnabled, toggle: setSoundEnabled },
                    { title: 'Daily Workout Reminders', desc: 'Alerts on scheduled training days', state: workoutReminders, toggle: setWorkoutReminders },
                    { title: 'Hydration Notifications', desc: 'Reminders to log daily water consumption', state: waterReminders, toggle: setWaterReminders },
                  ].map((pref, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                      <div>
                        <h4 className="text-sm font-bold text-white">{pref.title}</h4>
                        <p className="text-xs text-slate-400">{pref.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => pref.toggle(!pref.state)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${pref.state ? 'bg-violet-600' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${pref.state ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Action Cards */}
                <div className="space-y-3 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                    <div>
                      <h4 className="text-sm font-bold text-violet-200">Re-run AI Onboarding Wizard</h4>
                      <p className="text-xs text-slate-400">Recalculate physiological metrics from scratch.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetData}
                      className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-violet-500"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Re-run Wizard
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
                    <div>
                      <h4 className="text-sm font-bold text-blue-200">Export Training Logs</h4>
                      <p className="text-xs text-slate-400">Download your progress history as a CSV file.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-blue-500"
                    >
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <div>
                      <h4 className="text-sm font-bold text-rose-300">Delete Account & Reset Data</h4>
                      <p className="text-xs text-slate-400">Permanently clear stored profile and workout state.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Button Bar */}
            <div className="flex items-center justify-end border-t border-white/8 pt-5">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:bg-violet-500 active:scale-[0.99]"
              >
                <Save className="h-4 w-4" /> Save All Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
