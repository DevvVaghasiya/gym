import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../store/useUserStore';
import { useAuthStore } from '../store/useAuthStore';
import {
  Trash, Moon, Sun, Mail, Check, RotateCw,
  Settings as SettingsIcon, ShieldAlert, Cpu,
  Camera, LogOut, ChevronRight, User, ShieldCheck, Activity, Plus
} from 'lucide-react';

interface WearableSource {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSynced: string;
  syncedData: Record<string, string>;
}

export default function SettingsPage() {
  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);
  const setProfile = useUserStore(state => state.setProfile);
  const logout = useAuthStore(state => state.logout);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof localStorage !== 'undefined' ? (localStorage.getItem('theme') === 'light' ? 'light' : 'dark') : 'dark'
  );
  const [message, setMessage] = useState('');
  const [syncingWearables, setSyncingWearables] = useState<string | null>(null);

  const [wearables, setWearables] = useState<WearableSource[]>([
    { id: 'whoop', name: 'WHOOP', icon: '⚡', connected: true, lastSynced: '10:30 AM', syncedData: { hrv: '68 ms', sleep: '7.8 hrs' } },
    { id: 'apple_watch', name: 'Apple Watch', icon: '⌚', connected: false, lastSynced: 'Never', syncedData: { steps: '0', calories: '0 kcal' } },
    { id: 'garmin', name: 'Garmin', icon: '🚴', connected: false, lastSynced: 'Never', syncedData: { hrv: '0 ms', steps: '0' } },
  ]);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('light', theme === 'light');
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  const handleSave = () => {
    updateProfile(form);
    setEditing(false);
    setMessage('System parameters updated.');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUploadDP = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      updateProfile({ avatar: url });
      setForm({ ...form, avatar: url });
    };
    reader.readAsDataURL(file);
  };

  const toggleWearable = async (id: string) => {
    setWearables(prev => prev.map(w => {
      if (w.id === id) {
        const nextState = !w.connected;
        return {
          ...w,
          connected: nextState,
          lastSynced: nextState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'
        };
      }
      return w;
    }));
  };

  const handleDeleteAccount = () => {
    if (!confirm('Are you absolutely sure you want to delete your account? All data will be permanently wiped.')) return;
    setProfile(null as any);
    logout();
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 font-bold uppercase tracking-widest animate-pulse">
        Initializing Secure Environment...
      </div>
    );
  }

  const inputClasses = "w-full bg-white/[0.03] border border-white/10 rounded-[1.2rem] px-5 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-300 text-sm font-bold shadow-inner";
  const labelClasses = "block text-[10px] font-extrabold text-gray-500 mb-2 ml-1 uppercase tracking-widest";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-7xl mx-auto pb-20 space-y-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-none mb-3">System Control</h1>
          <p className="text-gray-500 font-medium text-sm">Manage physiological parameters, security, and neural data pipelines.</p>
        </div>
        <button
          onClick={() => logout()}
          className="px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm flex items-center gap-2 hover:bg-red-500/20 transition-all uppercase tracking-[0.1em]"
        >
          <LogOut className="w-4 h-4" /> End Session
        </button>
      </header>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-3xl text-sm font-bold flex items-center justify-center gap-3 shadow-xl"
          >
            <Check className="w-5 h-5" />
            <span>{message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="stat-card flex flex-col items-center text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/15 transition-colors" />

            <div className="relative group/avatar mb-8">
              <div className="w-32 h-32 rounded-[3rem] bg-gradient-to-br from-blue-500 to-purple-600 p-[3px] shadow-2xl shadow-blue-500/20">
                <div className="w-full h-full rounded-[2.8rem] bg-slate-900 flex items-center justify-center overflow-hidden">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-white">{profile.name.charAt(0)}</span>
                  )}
                </div>
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[3rem] opacity-0 group-hover/avatar:opacity-100 transition-all cursor-pointer backdrop-blur-sm">
                <Camera className="w-8 h-8 text-white" />
                <input onChange={handleUploadDP} type="file" accept="image/*" className="hidden" />
              </label>
            </div>

            <h3 className="text-2xl font-black text-white tracking-tight mb-2">{profile.name}</h3>
            <p className="text-gray-500 font-medium text-sm mb-8">{profile.email}</p>

            <div className="flex gap-3 w-full">
              <div className="flex-1 p-4 rounded-3xl bg-white/[0.03] border border-white/5">
                <p className="text-gray-600 text-[10px] font-extrabold uppercase tracking-widest mb-1">Rank</p>
                <p className="text-white font-black text-sm">Level {profile.level || 1}</p>
              </div>
              <div className="flex-1 p-4 rounded-3xl bg-white/[0.03] border border-white/5">
                <p className="text-gray-600 text-[10px] font-extrabold uppercase tracking-widest mb-1">Streak</p>
                <p className="text-orange-500 font-black text-sm">{profile.streak || 1} Days</p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h4 className="text-gray-500 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-6">Interface Theme</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-yellow-400" />}
                <span className="text-white font-bold text-sm">{theme === 'dark' ? 'Neural Dark' : 'Clinical Light'}</span>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-12 h-7 rounded-full bg-white/5 border border-white/10 relative transition-colors"
              >
                <motion.div
                  animate={{ x: theme === 'dark' ? 22 : 4 }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-lg"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="lg:col-span-8 space-y-8">
          <div className="stat-card !p-0 overflow-hidden">
            <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Physiological Blueprint</h3>
                <p className="text-gray-500 font-medium text-sm mt-1">Core biometric data for metabolic calculation.</p>
              </div>
              <button 
                onClick={() => editing ? handleSave() : setEditing(true)}
                className={`px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${
                  editing ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                {editing ? 'Commit Changes' : 'Update Metrics'}
              </button>
            </div>

            <div className="p-10">
              {editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className={labelClasses}>Identity Name</label>
                      <input className={inputClasses} value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Current Weight (kg)</label>
                        <input type="number" step="0.1" className={inputClasses} value={form.weightKg || ''} onChange={e => setForm({...form, weightKg: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClasses}>Target (kg)</label>
                        <input type="number" step="0.1" className={inputClasses} value={form.goalWeightKg || ''} onChange={e => setForm({...form, goalWeightKg: Number(e.target.value)})} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className={labelClasses}>Age (Years)</label>
                        <input type="number" className={inputClasses} value={form.age || ''} onChange={e => setForm({...form, age: Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className={labelClasses}>Body Fat (%)</label>
                        <input type="number" step="0.1" className={inputClasses} value={form.bodyFatPercent || ''} onChange={e => setForm({...form, bodyFatPercent: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClasses}>Daily Sleep Goal (Hours)</label>
                      <input type="number" className={inputClasses} value={form.sleepHours || 7} onChange={e => setForm({...form, sleepHours: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Weight', val: profile.weightKg, unit: 'kg' },
                    { label: 'Target', val: profile.goalWeightKg, unit: 'kg' },
                    { label: 'BMR', val: profile.bmr, unit: 'kcal' },
                    { label: 'TDEE', val: profile.tdee, unit: 'kcal' },
                  ].map((s, i) => (
                    <div key={i} className="p-6 rounded-[2.2rem] bg-white/[0.02] border border-white/5 text-center hover:bg-white/[0.04] transition-all">
                      <p className="text-gray-600 text-[10px] font-extrabold uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-white font-black text-xl">{s.val} <span className="text-gray-700 text-xs font-bold uppercase">{s.unit}</span></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4 mb-8 px-2">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 shadow-inner">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">Biosensor Integration</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Automated Neural Data Pipeline</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wearables.map(w => (
                <div key={w.id} className="p-6 rounded-[2.5rem] bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 transition-all group/w">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-5">
                      <div className="text-3xl filter grayscale group-hover/w:grayscale-0 transition-all duration-500">{w.icon}</div>
                      <div>
                        <p className="text-white font-bold text-base">{w.name}</p>
                        <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">{w.connected ? `Synced ${w.lastSynced}` : 'Inactive'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleWearable(w.id)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                        w.connected ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-white/5 text-gray-500 border border-white/10'
                      }`}
                    >
                      {w.connected ? <Trash className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                  {w.connected && (
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/5">
                      {Object.entries(w.syncedData).map(([k, v]) => (
                        <div key={k} className="p-3 rounded-2xl bg-black/20 text-center border border-white/5">
                          <p className="text-gray-500 text-[8px] font-black uppercase tracking-widest mb-1">{k}</p>
                          <p className="text-white font-bold text-xs">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 rounded-[3rem] bg-red-500/5 border border-red-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="text-center md:text-left">
               <h4 className="text-white font-bold flex items-center justify-center md:justify-start gap-2 text-sm uppercase tracking-widest">
                 <ShieldAlert className="w-4 h-4 text-red-500" /> Secure Purge Protocol
               </h4>
               <p className="text-red-500/60 text-xs font-medium mt-1">Permanently erase all physiological profiles and training history.</p>
             </div>
             <button
               onClick={handleDeleteAccount}
               className="px-8 py-3 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all shadow-xl shadow-red-500/5"
             >
               Delete Records
             </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
