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
  User, Dumbbell, Utensils, Bell,
  Check, LogOut, Camera, RotateCcw, ShieldAlert, Sliders,
  Sparkles, Save, Heart, ShieldCheck
} from 'lucide-react';

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

    // Regenerate plans if key parameters changed
    const newWorkoutPlan = generateWorkoutPlan({ ...profile, ...form });
    setWorkoutPlan(newWorkoutPlan);

    const newDietPlan = generateAIDietPlan({ ...profile, ...form });
    setDietPlan(newDietPlan);

    setSavedMsg('Settings saved! Your AI workout & diet plans have been updated.');
    setTimeout(() => setSavedMsg(''), 4000);
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
    if (!confirm('Are you sure you want to reset your account profile and re-run onboarding?')) return;
    navigate('/onboarding');
  };

  const handleDeleteAccount = () => {
    if (!confirm('Are you sure you want to permanently delete your account data?')) return;
    setProfile(null as any);
    logout();
  };

  const handleExportData = () => {
    if (!profile) return;
    const recoveryScore = profile.sleepHours >= 8 ? 88 : profile.sleepHours >= 7 ? 74 : 52;
    
    let csv = "date,goal,sleep_hours,recovery_score,weight_kg,recent_pr_exercise,recent_pr_weight\n";
    
    entries.forEach(entry => {
      const recentPR = prs.find(p => p.date === entry.date) || prs[prs.length - 1] || null;
      csv += `${entry.date},${profile.goal},${profile.sleepHours},${recoveryScore},${entry.weightKg},${recentPR ? recentPR.exerciseName : 'none'},${recentPR ? recentPR.weight : 0}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fitai_feature_table_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    setSavedMsg('Feature Table exported successfully!');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-bold">
        Loading settings...
      </div>
    );
  }

  const inputClasses = "w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all";
  const labelClasses = "block text-xs font-bold text-slate-400 mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-6xl mx-auto pb-24 space-y-8 font-sans"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-white/10 p-6 sm:p-8 rounded-[2rem] backdrop-blur-xl">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">App Settings</h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium mt-1">Manage your body stats, workout preferences, diet targets & app options.</p>
        </div>

        <div className="flex w-full items-stretch gap-3 sm:w-auto sm:items-center">
          <button
            onClick={handleSaveSettings}
            aria-label="Save changes"
            className="flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500 sm:flex-none sm:px-6 sm:text-xs"
          >
            <Save className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Save</span>
            <span className="hidden sm:inline">Save Changes</span>
          </button>
          <button
            onClick={() => logout()}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-[11px] font-bold text-slate-300 transition-all hover:bg-slate-700 hover:text-white sm:flex-none sm:px-4 sm:text-xs"
          >
            <LogOut className="h-4 w-4 shrink-0 text-rose-400" /> Sign Out
          </button>
        </div>
      </header>

      {/* Save Toast Notification */}
      <AnimatePresence>
        {savedMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-xl"
          >
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{savedMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Profile Summary & Navigation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[2rem] border border-white/10 bg-slate-900/60 p-4 text-left backdrop-blur-xl sm:block sm:p-6 sm:text-center">
            <div className="group relative h-14 w-14 shrink-0 sm:mx-auto sm:mb-4 sm:h-24 sm:w-24">
              <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-xl">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
                  {form.avatar ? (
                    <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-white">{form.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
              </div>
              <label className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                <Camera className="w-5 h-5 text-white" />
                <input type="file" accept="image/*" onChange={handleUploadAvatar} className="hidden" />
              </label>
            </div>

            <div className="min-w-0 flex-1 sm:flex-none">
              <h3 className="truncate text-lg font-black text-white sm:text-xl">{form.name || 'User'}</h3>
              <p className="truncate text-xs font-medium text-slate-400 sm:mb-4">{form.email || 'user@example.com'}</p>
            </div>

            <div className="grid w-full grid-cols-2 gap-2 border-t border-white/5 pt-3 text-center text-xs sm:pt-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-slate-500 text-[10px] font-extrabold uppercase block mb-0.5">Current Weight</span>
                <span className="text-white font-bold">{form.weightKg || 70} kg</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                <span className="text-slate-500 text-[10px] font-extrabold uppercase block mb-0.5">Target Weight</span>
                <span className="text-cyan-400 font-bold">{form.goalWeightKg || 70} kg</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-4 gap-1.5 rounded-[2rem] border border-white/10 bg-slate-900/60 p-2 backdrop-blur-xl sm:p-3 lg:flex lg:flex-col lg:gap-1.5">
            {[
              { id: 'profile', label: 'Body Biometrics & Profile', mobileLabel: 'Profile', icon: User },
              { id: 'workout', label: 'Workout & Training Rules', mobileLabel: 'Workout', icon: Dumbbell },
              { id: 'nutrition', label: 'Diet & Nutrition Preferences', mobileLabel: 'Diet', icon: Utensils },
              { id: 'preferences', label: 'App Theme & Notifications', mobileLabel: 'App', icon: Sliders },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                aria-pressed={activeTab === tab.id}
                className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-extrabold transition-all sm:flex-row sm:gap-2 sm:px-3 sm:text-xs lg:min-h-11 lg:justify-start lg:px-4 lg:py-3 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Settings Form Content */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl space-y-6">
            
            {/* TAB 1: Profile & Biometrics */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-white">Body Biometrics</h3>
                  <p className="text-xs text-slate-400 font-medium">Update your physiological metrics for accurate AI calculations.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Full Name</label>
                    <input
                      type="text" className={inputClasses} value={form.name || ''}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Email Address</label>
                    <input
                      type="email" className={inputClasses} value={form.email || ''}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Age (Years)</label>
                    <input
                      type="number" className={inputClasses} value={form.age || 25}
                      onChange={e => setForm({ ...form, age: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Height (cm)</label>
                    <input
                      type="number" className={inputClasses} value={form.heightCm || 175}
                      onChange={e => setForm({ ...form, heightCm: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Current Weight (kg)</label>
                    <input
                      type="number" step="0.5" className={inputClasses} value={form.weightKg || 70}
                      onChange={e => setForm({ ...form, weightKg: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Goal Weight (kg)</label>
                    <input
                      type="number" step="0.5" className={inputClasses} value={form.goalWeightKg || 70}
                      onChange={e => setForm({ ...form, goalWeightKg: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Primary Goal</label>
                    <select
                      className={inputClasses} value={form.goal || 'recomposition'}
                      onChange={e => setForm({ ...form, goal: e.target.value })}
                    >
                      <option value="weight_loss">Weight Loss / Fat Burn</option>
                      <option value="muscle_gain">Muscle Gain / Bulking</option>
                      <option value="recomposition">Body Recomposition</option>
                      <option value="strength">Pure Strength & Power</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Activity Level</label>
                    <select
                      className={inputClasses} value={form.activityLevel || 'moderate'}
                      onChange={e => setForm({ ...form, activityLevel: e.target.value })}
                    >
                      <option value="sedentary">Sedentary (Desk Job)</option>
                      <option value="light">Lightly Active</option>
                      <option value="moderate">Moderately Active</option>
                      <option value="high">Very Active</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Workout Rules */}
            {activeTab === 'workout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-white">Workout & Training Rules</h3>
                  <p className="text-xs text-slate-400 font-medium">Customize your AI exercise split, equipment, and workout length.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Training Experience</label>
                    <select
                      className={inputClasses} value={form.experience || 'beginner'}
                      onChange={e => setForm({ ...form, experience: e.target.value })}
                    >
                      <option value="beginner">Beginner (0 - 1 year)</option>
                      <option value="intermediate">Intermediate (1 - 3 years)</option>
                      <option value="advanced">Advanced (3+ years)</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Workout Days per Week</label>
                    <select
                      className={inputClasses} value={form.daysPerWeek || 4}
                      onChange={e => setForm({ ...form, daysPerWeek: Number(e.target.value) })}
                    >
                      <option value={3}>3 Days / Week</option>
                      <option value={4}>4 Days / Week</option>
                      <option value={5}>5 Days / Week</option>
                      <option value={6}>6 Days / Week</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Session Duration</label>
                    <select
                      className={inputClasses} value={form.workoutDuration || 60}
                      onChange={e => setForm({ ...form, workoutDuration: Number(e.target.value) })}
                    >
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes</option>
                      <option value={75}>75 Minutes</option>
                      <option value={90}>90 Minutes</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Gym Type</label>
                    <select
                      className={inputClasses} value={form.gymType || 'commercial'}
                      onChange={e => setForm({ ...form, gymType: e.target.value })}
                    >
                      <option value="commercial">Commercial Gym (Full Equipment)</option>
                      <option value="home">Home Gym (Dumbbells/Bands)</option>
                      <option value="bodyweight">Calisthenics (Bodyweight Only)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Diet & Nutrition */}
            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-white">Diet & Hydration Targets</h3>
                  <p className="text-xs text-slate-400 font-medium">Configure food preferences and daily water targets.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Dietary Preference</label>
                    <select
                      className={inputClasses} value={form.foodPreference || 'vegetarian'}
                      onChange={e => setForm({ ...form, foodPreference: e.target.value })}
                    >
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non_veg">Non-Vegetarian</option>
                      <option value="eggetarian">Eggetarian</option>
                      <option value="vegan">Vegan</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Daily Water Goal (Liters)</label>
                    <input
                      type="number" step="0.5" className={inputClasses} value={form.dailyWaterIntakeLiters || 3.0}
                      onChange={e => setForm({ ...form, dailyWaterIntakeLiters: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Meals Per Day</label>
                    <select
                      className={inputClasses} value={form.numberOfMeals || 4}
                      onChange={e => setForm({ ...form, numberOfMeals: Number(e.target.value) })}
                    >
                      <option value={3}>3 Meals</option>
                      <option value={4}>4 Meals</option>
                      <option value={5}>5 Meals</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClasses}>Daily Sleep Target (Hours)</label>
                    <input
                      type="number" step="0.5" className={inputClasses} value={form.sleepHours || 8}
                      onChange={e => setForm({ ...form, sleepHours: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Preferences & Account */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-white">Preferences & Notifications</h3>
                  <p className="text-xs text-slate-400 font-medium">Control audio cues, workout notifications, and account data.</p>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  {[
                    { title: 'Rest Timer Audio Beeps', desc: 'Play sound when workout rest timer expires', state: soundEnabled, toggle: setSoundEnabled },
                    { title: 'Daily Workout Reminders', desc: 'Notify when today is a scheduled training day', state: workoutReminders, toggle: setWorkoutReminders },
                    { title: 'Hydration Log Notifications', desc: 'Periodic reminders to meet daily water goal', state: waterReminders, toggle: setWaterReminders },
                  ].map((pref, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{pref.title}</h4>
                        <p className="text-xs text-slate-500">{pref.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => pref.toggle(!pref.state)}
                        className={`w-12 h-6 rounded-full transition-colors relative ${pref.state ? 'bg-blue-600' : 'bg-slate-800'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${pref.state ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Re-run Onboarding & Danger Zone */}
                <div className="pt-6 border-t border-slate-800 space-y-4">
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-blue-300">Re-run AI Onboarding Wizard</h4>
                      <p className="text-xs text-slate-400">Recalculate your physiological baseline from scratch.</p>
                    </div>
                    <button
                      type="button" onClick={handleResetData}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Re-run Wizard
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-cyan-300">Export Training Data (CSV)</h4>
                      <p className="text-xs text-slate-400">Download your feature table for Phase 2 AI Model Training.</p>
                    </div>
                    <button
                      type="button" onClick={handleExportData}
                      className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Export CSV
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-rose-300">Delete Account & Data</h4>
                      <p className="text-xs text-slate-400">Permanently remove profile records from local storage.</p>
                    </div>
                    <button
                      type="button" onClick={handleDeleteAccount}
                      className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save Button */}
            <div className="pt-6 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save All Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
