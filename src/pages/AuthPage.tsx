import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { API_BASE } from '../lib/api';
import {
  Dumbbell, ArrowRight, CheckCircle2, AlertCircle, Mail,
  Lock, User, Phone, Eye, EyeOff, Loader2, Zap, Sparkles
} from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isOtpPending, setIsOtpPending] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const navigate = useNavigate();
  const setAuth = useAuthStore(state => state.setAuth);
  const setProfile = useUserStore(state => state.setProfile);
  const clearProfile = useUserStore(state => state.clearProfile);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1-Click Demo Login
  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      const mockToken = 'demo_user_token_' + Date.now();
      setAuth(mockToken);
      setProfile({
        name: 'Alex Rivera',
        email: 'alex.rivera@fitai.app',
        phone: '+1 555-0198',
        age: 26,
        gender: 'male',
        heightCm: 178,
        weightKg: 75,
        goalWeightKg: 72,
        bodyFatPercent: 15,
        muscleMassPercent: 42,
        waterPercent: 60,
        bmi: 23.7,
        bmr: 1750,
        tdee: 2400,
        experience: 'intermediate',
        goal: 'recomposition',
        daysPerWeek: 4,
        workoutDuration: 60,
        gymType: 'commercial',
        availableEquipment: ['dumbbell', 'barbell', 'cable', 'machine'],
        injuries: [],
        mobilityIssues: [],
        previousSurgeries: [],
        activityLevel: 'moderate',
        occupation: 'Software Developer',
        sleepHours: 7.5,
        stressLevel: 'low',
        dailyWaterIntakeLiters: 3.0,
        smokingHabit: false,
        alcoholConsumption: 'none',
        country: 'United States',
        foodPreference: 'non_veg',
        dailyFoodBudget: 20,
        numberOfMeals: 4,
        allergies: [],
        favoriteFoods: ['Chicken Breast', 'Oats', 'Eggs', 'Rice'],
        dislikedFoods: [],
        workoutTime: '08:00',
        wakeupTime: '06:30',
        sleepTime: '22:30',
        xp: 350,
        level: 3,
        badges: ['Consistent Starter', 'Hydration Master'],
        streak: 5,
      });
      setIsLoading(false);
      navigate('/');
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    if (isForgotPassword) {
      setTimeout(() => {
        setSuccessMsg(`Password reset link sent to ${formData.email || 'your email'}`);
        setIsLoading(false);
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccessMsg('');
        }, 4000);
      }, 700);
      return;
    }

    if (!isLogin && !isOtpPending) {
      setTimeout(() => {
        setIsOtpPending(true);
        setSuccessMsg("Verification code sent! Use OTP '1234' to verify.");
        setIsLoading(false);
      }, 700);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isLogin) {
        if (!formData.email.trim() || formData.password.length < 4) {
          throw new Error('Please enter a valid email and password.');
        }

        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email, password: formData.password }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');
          setAuth(data.token);
        } catch {
          const mockToken = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
          setAuth(mockToken);
        }

        const profile = useUserStore.getState().profile;
        if (profile && profile.name && profile.heightCm > 0) {
          navigate('/');
        } else {
          navigate('/onboarding', { state: { prefill: { email: formData.email } } });
        }
      } else {
        const joinedOtp = otpCode.join('');
        if (joinedOtp !== '1234') {
          throw new Error('Invalid OTP code. Enter 1234.');
        }

        try {
          const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.name || 'New User',
              email: formData.email,
              phone: formData.phone,
              password: formData.password,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Signup failed');
          setAuth(data.token);
        } catch {
          const mockToken = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
          setAuth(mockToken);
        }

        clearProfile();
        navigate('/onboarding', {
          state: { prefill: { name: formData.name, email: formData.email, phone: formData.phone } },
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSocialLogin = async (provider: 'google' | 'apple') => {
    setError('');
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      const mockToken = `mock_${provider}_token_${Math.random().toString(36).substring(2)}`;
      setAuth(mockToken);

      const profile = useUserStore.getState().profile;
      if (profile && profile.name && profile.heightCm > 0) {
        navigate('/');
      } else {
        clearProfile();
        navigate('/onboarding', {
          state: {
            prefill: {
              name: provider === 'google' ? 'Google User' : 'Apple User',
              email: `${provider}user@example.com`,
            },
          },
        });
      }
    } catch {
      setError('Social authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    if (val.length > 1) val = val[val.length - 1];

    const newOtp = [...otpCode];
    newOtp[index] = val;
    setOtpCode(newOtp);

    if (val !== '' && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpCode[index] === '' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#050816] px-4 py-8 font-sans selection:bg-violet-500/30">
      {/* Background ambient glow matching Onboarding */}
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet-600/15 via-indigo-600/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-[400px] w-[400px] rounded-full bg-gradient-to-tr from-purple-600/10 via-pink-600/5 to-transparent blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Brand header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-500/25 mb-3">
            <Dumbbell className="h-7 w-7 text-white" />
          </div>
          <h1 className="flex items-center justify-center gap-1.5 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Fit<span className="bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">AI</span>
          </h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Intelligent Fitness & Nutrition Coaching
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl ring-1 ring-white/5 backdrop-blur-3xl sm:p-8">
          {/* Segmented Tab Switcher */}
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/8 bg-white/4 p-1">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
              className={`rounded-xl py-2.5 text-xs font-extrabold transition-all ${
                isLogin && !isForgotPassword
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
              className={`rounded-xl py-2.5 text-xs font-extrabold transition-all ${
                !isLogin && !isForgotPassword
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-extrabold tracking-tight text-white">
              {isForgotPassword
                ? 'Reset Password'
                : isOtpPending
                ? 'Verify Code'
                : isLogin
                ? 'Welcome Back'
                : 'Create Account'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {isForgotPassword
                ? 'Enter your email to receive recovery instructions.'
                : isOtpPending
                ? 'Enter code 1234 to verify your registration.'
                : isLogin
                ? 'Sign in to access your workout, diet and progress plans.'
                : 'Get started with an AI-tailored health routine.'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isForgotPassword ? (
                <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </motion.div>
              ) : isOtpPending ? (
                <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 text-center">
                  <p className="text-xs text-slate-400">Demo verification code is <strong className="text-violet-300">1234</strong></p>
                  <div className="flex justify-center gap-3">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el; }}
                        type="text"
                        maxLength={1}
                        className="h-14 w-12 rounded-2xl border border-white/10 bg-white/5 text-center text-2xl font-black text-white outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
                        value={digit}
                        onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)}
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99]"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify & Continue'}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3.5">
                  {!isLogin && (
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          required={!isLogin}
                          placeholder="Alex Rivera"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="tel"
                          required={!isLogin}
                          placeholder="+1 555-0199"
                          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                          value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</label>
                      {isLogin && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-xs font-semibold text-violet-400 transition-colors hover:text-violet-300 hover:underline"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm font-semibold text-white placeholder-slate-500 transition-all focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-indigo-500 active:scale-[0.99] mt-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Quick 1-Click Demo Login Button */}
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 py-3 text-xs font-bold text-violet-300 transition-all hover:bg-violet-500/20 active:scale-[0.99]"
                  >
                    <Zap className="h-4 w-4 text-amber-400" />
                    Demo Login (Skip with 1-Click)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Social Sign-In */}
          {!isForgotPassword && !isOtpPending && (
            <div className="mt-6 border-t border-white/8 pt-5">
              <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Or continue with
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => triggerSocialLogin('google')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/4 py-2.5 px-4 text-xs font-bold text-slate-200 transition-all hover:bg-white/8"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.56 0 2.97.55 4.09 1.46l3.07-3.07C17.3 1.63 14.82 1 12 1 7.46 1 3.59 3.58 1.68 7.36l3.68 2.85C6.27 7.27 8.9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.57-.2-2.27H12v4.51h6.47c-.28 1.48-1.12 2.73-2.39 3.58l3.69 2.87c2.16-1.99 3.72-4.94 3.72-8.69z"/>
                    <path fill="#FBBC05" d="M5.36 14.79c-.23-.68-.36-1.41-.36-2.16s.13-1.48.36-2.16L1.68 7.62C.61 9.77 0 12.18 0 14.79s.61 5.02 1.68 7.17l3.68-2.85c-.01-.11-.08-.21-.08-.32z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.69-2.87c-1.08.73-2.46 1.16-4.26 1.16-3.1 0-5.73-2.27-6.64-5.21L1.68 17.02C3.59 20.8 7.46 23.38 12 23.38z"/>
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => triggerSocialLogin('apple')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/4 py-2.5 px-4 text-xs font-bold text-slate-200 transition-all hover:bg-white/8"
                >
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.66-7.85-11.91-14.42-6.53-10.15-11.7-21.72-15.52-34.72-3.82-13-5.73-25.04-5.73-36.14 0-14.34 3.58-26.4 10.74-36.18 7.16-9.78 16.29-14.79 27.39-15.02 5.01 0 10.37 1.34 16.08 4.02 5.71 2.68 9.38 4.07 11.02 4.17 1.64 0 5.42-1.45 11.34-4.35 5.92-2.9 11.16-4.22 15.72-3.96 11.64.67 21.1 4.7 28.38 12.1-10.15 6.15-15.11 14.76-14.88 25.82.23 8.7 3.63 15.96 10.2 21.78 6.57 5.82 14.39 9.17 23.46 10.05-2.01 6.14-4.54 12.35-7.59 18.63zM119.22 31.84c0-7.38 2.66-14.37 7.98-20.97 5.32-6.6 11.96-10.56 19.92-11.87.23 1.12.35 2.12.35 3 0 7.37-2.73 14.3-8.19 20.79-5.46 6.49-12.16 10.33-20.1 11.51-.04-.89-.06-1.71-.06-2.46z"/>
                  </svg>
                  Apple
                </button>
              </div>
            </div>
          )}

          {isForgotPassword && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-slate-400 transition-colors hover:text-white"
              >
                ← Back to Sign In
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
