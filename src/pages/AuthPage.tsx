import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { API_BASE } from '../lib/api';
import { 
  Dumbbell, ArrowRight, CheckCircle, ShieldAlert, Mail, 
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

  // 1-Click Demo Login function
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
        } catch (backendError) {
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
        } catch (backendError) {
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
    } catch (err: any) {
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background Radial Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[440px] mx-auto relative z-10 my-auto"
      >
        {/* Top Brand Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_10px_30px_rgba(59,130,246,0.5)] mb-4">
            <Dumbbell className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1">
            Fit<span className="text-cyan-400">AI</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium mt-1">Your AI Personal Fitness & Nutrition Coach</p>
        </div>

        {/* Main Clean Auth Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
          
          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                isLogin && !isForgotPassword 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setIsForgotPassword(false); setError(''); setSuccessMsg(''); }}
              className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                !isLogin && !isForgotPassword 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-extrabold text-white">
              {isForgotPassword ? "Reset Password" : isOtpPending ? "Verify Mobile OTP" : isLogin ? "Welcome Back" : "Create Your Profile"}
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              {isForgotPassword ? "Enter your email to receive a recovery link." : isOtpPending ? "Enter code 1234 to verify." : isLogin ? "Sign in to access your custom workouts & diet plans." : "Sign up for personalized AI fitness guidance."}
            </p>
          </div>

          {/* Feedback Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 mb-5"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 mb-5"
            >
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {isForgotPassword ? (
                <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email" required placeholder="you@example.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <button
                    type="submit" disabled={isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
                  </button>
                </motion.div>
              ) : isOtpPending ? (
                <motion.div key="otp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 text-center">
                  <p className="text-xs text-slate-400">Enter the 4-digit code (Demo code: <strong className="text-white">1234</strong>)</p>
                  <div className="flex justify-center gap-3">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el; }}
                        type="text" maxLength={1}
                        className="w-12 h-14 bg-slate-950 border border-slate-800 rounded-xl text-center text-2xl font-bold text-white focus:border-blue-500 outline-none"
                        value={digit} onChange={e => handleOtpChange(idx, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(idx, e)} disabled={isLoading}
                      />
                    ))}
                  </div>
                  <button
                    type="submit" disabled={isLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                  </button>
                </motion.div>
              ) : (
                <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {!isLogin && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text" required={!isLogin} placeholder="John Doe"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                          value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="email" required placeholder="you@example.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  {!isLogin && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="tel" required={!isLogin} placeholder="+1 555-0199"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                          value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-300">Password</label>
                      {isLogin && (
                        <button
                          type="button" onClick={() => setIsForgotPassword(true)}
                          className="text-xs text-blue-400 hover:underline font-semibold"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                        value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        disabled={isLoading}
                      />
                      <button
                        type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="submit" disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mt-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{isLogin ? 'Sign In' : 'Create Account'} <ArrowRight className="w-4 h-4" /></>}
                  </button>

                  {/* Quick Demo Button */}
                  <button
                    type="button" onClick={handleDemoLogin} disabled={isLoading}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-cyan-400 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-400" /> Demo Login (Skip Auth)
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Social Sign-In */}
          {!isForgotPassword && !isOtpPending && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-center text-xs font-semibold text-slate-400 mb-3">Or continue with</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button" onClick={() => triggerSocialLogin('google')} disabled={isLoading}
                  className="py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  Google
                </button>
                <button
                  type="button" onClick={() => triggerSocialLogin('apple')} disabled={isLoading}
                  className="py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 transition-all"
                >
                  Apple
                </button>
              </div>
            </div>
          )}

          {isForgotPassword && (
            <div className="mt-6 text-center">
              <button
                type="button" onClick={() => setIsForgotPassword(false)}
                className="text-xs font-bold text-slate-400 hover:text-white"
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
