import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useUserStore } from '../store/useUserStore';
import { Dumbbell, ArrowRight, Sparkles, CheckCircle, ShieldAlert, Mail, Lock, User, Activity, Phone, Eye, EyeOff, Loader2 } from 'lucide-react';

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

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    if (isForgotPassword) {
      setTimeout(() => {
        setSuccessMsg(`A password reset link has been sent to ${formData.email}`);
        setIsLoading(false);
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccessMsg('');
        }, 5000);
      }, 1000);
      return;
    }

    if (!isLogin && !isOtpPending) {
      setTimeout(() => {
        setIsOtpPending(true);
        setSuccessMsg("Verification code sent! Use OTP '1234' to verify.");
        setIsLoading(false);
      }, 1000);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1200));

      if (isLogin) {
        if (formData.email.trim() === '' || formData.password.length < 4) {
          throw new Error('Please fill in valid credentials.');
        }
        
        const mockToken = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
        setAuth(mockToken);
        
        const profile = useUserStore.getState().profile;
        if (profile && profile.name && profile.heightCm > 0) {
          navigate('/');
        } else {
          navigate('/onboarding');
        }
      } else {
        const joinedOtp = otpCode.join('');
        if (joinedOtp !== '1234') {
          throw new Error('Invalid OTP code. Please enter 1234.');
        }

        const mockToken = 'mock_jwt_token_' + Math.random().toString(36).substring(2);
        setAuth(mockToken);
        
        setProfile({
          name: formData.name || 'New User',
          email: formData.email,
          phone: formData.phone,
          age: 25,
          gender: 'male',
          heightCm: 0,
          weightKg: 70,
          goalWeightKg: 70,
          bodyFatPercent: 15,
          muscleMassPercent: 40,
          waterPercent: 60,
          bmi: 22.9,
          bmr: 1650,
          tdee: 2200,
          experience: 'beginner',
          goal: 'recomposition',
          daysPerWeek: 3,
          workoutDuration: 60,
          gymType: 'commercial',
          availableEquipment: ['dumbbell', 'barbell', 'bodyweight'],
          injuries: [],
          mobilityIssues: [],
          previousSurgeries: [],
          activityLevel: 'moderate',
          occupation: 'Office Worker',
          sleepHours: 7,
          stressLevel: 'low',
          dailyWaterIntakeLiters: 2.5,
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
          wakeupTime: '06:00',
          sleepTime: '22:30',
          xp: 100,
          level: 1,
          badges: [],
          streak: 1,
        });

        navigate('/onboarding');
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockToken = `mock_${provider}_token_${Math.random().toString(36).substring(2)}`;
      setAuth(mockToken);
      
      const profile = useUserStore.getState().profile;
      if (profile && profile.name && profile.heightCm > 0) {
        navigate('/');
      } else {
        setProfile({
          name: provider === 'google' ? 'Google User' : 'Apple User',
          email: `${provider}user@example.com`,
          age: 28,
          gender: 'male',
          heightCm: 0,
          weightKg: 75,
          goalWeightKg: 72,
          bodyFatPercent: 16,
          muscleMassPercent: 42,
          waterPercent: 58,
          bmi: 23.7,
          bmr: 1720,
          tdee: 2350,
          experience: 'intermediate',
          goal: 'recomposition',
          daysPerWeek: 4,
          workoutDuration: 60,
          gymType: 'commercial',
          availableEquipment: ['dumbbell', 'barbell', 'cable'],
          injuries: [],
          mobilityIssues: [],
          previousSurgeries: [],
          activityLevel: 'moderate',
          occupation: 'Engineer',
          sleepHours: 8,
          stressLevel: 'medium',
          dailyWaterIntakeLiters: 3,
          smokingHabit: false,
          alcoholConsumption: 'light',
          country: 'USA',
          foodPreference: 'non_veg',
          dailyFoodBudget: 25,
          numberOfMeals: 4,
          allergies: [],
          favoriteFoods: [],
          dislikedFoods: [],
          workoutTime: '18:00',
          wakeupTime: '07:00',
          sleepTime: '23:00',
          xp: 200,
          level: 2,
          badges: [],
          streak: 2,
        });
        navigate('/onboarding');
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

  const inputClasses = "w-full bg-white/[0.05] border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all duration-300 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";
  const labelClasses = "block text-[11px] font-black text-gray-500 mb-2 ml-1 uppercase tracking-widest";

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 lg:gap-16 items-stretch justify-center relative z-10"
      >
        {/* Left Side: Branding */}
        <div className="hidden lg:flex flex-col justify-between w-full lg:w-[45%] bg-slate-900/30 backdrop-blur-3xl rounded-[3rem] p-12 lg:p-16 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter text-white">FIT<span className="text-blue-500">AI</span></h1>
            </div>
          </div>

          <div className="mt-auto relative z-10">
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-black text-blue-300 tracking-widest uppercase">The Elite Intelligence Engine</span>
            </div>
            <h2 className="text-6xl font-black tracking-tighter text-white mb-8 leading-[0.95]">
              Unleash Your <br />
              <span className="text-gradient">Peak.</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-md font-medium leading-relaxed mb-12 opacity-80">
              Experience hyper-personalized AI workouts and precision metabolic mapping designed for elite performance.
            </p>

            <div className="grid grid-cols-2 gap-6">
              <div className="stat-card !bg-white/[0.02] !border-white/5">
                <Activity className="w-6 h-6 text-blue-500 mb-4" />
                <div className="text-white font-black text-2xl tracking-tighter">100%</div>
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Adaptive Logic</div>
              </div>
              <div className="stat-card !bg-white/[0.02] !border-white/5">
                <Dumbbell className="w-6 h-6 text-purple-500 mb-4" />
                <div className="text-white font-black text-2xl tracking-tighter">2.4M+</div>
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Calculated Sets</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="w-full max-w-[500px] mx-auto lg:mx-0 flex flex-col justify-center">
          <div className="backdrop-blur-3xl bg-slate-900/60 border border-white/10 rounded-[3rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col ring-1 ring-white/5">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

            <div className="mb-10 text-center">
              <h2 className="text-3xl font-black text-white tracking-tight mb-3">
                {isLogin ? "Elite Access" : isOtpPending ? "Verify Identity" : isForgotPassword ? "Reset Protocol" : "Join the Elite"}
              </h2>
              <p className="text-gray-400 text-sm font-medium opacity-70">
                {isLogin ? "Authenticate to resume your protocol." : isOtpPending ? "Input the verification sequence." : isForgotPassword ? "Initiate secure recovery sequence." : "Establish your physiological profile today."}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl text-xs font-bold flex items-center gap-3 mb-6"
              >
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-4 rounded-2xl text-xs font-bold flex items-center gap-3 mb-6"
              >
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5 flex-1">
              <AnimatePresence mode="wait">
                {isForgotPassword ? (
                  <motion.div
                    key="forgot"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email" required placeholder="Registered Email"
                        className={inputClasses} value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        disabled={isLoading}
                      />
                    </div>
                    <button
                      type="submit" disabled={isLoading}
                      className="w-full btn-premium py-4 px-6 rounded-2xl text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch Reset Vector'}
                    </button>
                  </motion.div>
                ) : isOtpPending ? (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8 text-center"
                  >
                    <div>
                      <p className="text-xs text-gray-500 font-medium mb-6 uppercase tracking-wider">4-Digit Verification Token</p>
                      <div className="flex justify-center gap-3 sm:gap-4">
                        {otpCode.map((digit, idx) => (
                          <input
                            key={idx}
                            ref={el => { otpRefs.current[idx] = el; }}
                            type="text"
                            maxLength={1}
                            className="w-12 h-16 sm:w-14 sm:h-18 bg-white/[0.03] border border-white/10 rounded-2xl text-center text-3xl font-black text-white focus:ring-2 focus:ring-blue-500 outline-none shadow-inner disabled:opacity-50"
                            value={digit}
                            onChange={e => handleOtpChange(idx, e.target.value)}
                            onKeyDown={e => handleOtpKeyDown(idx, e)}
                            disabled={isLoading}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      type="submit" disabled={isLoading}
                      className="w-full btn-premium py-4 px-6 rounded-2xl text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Initialize Protocol <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="auth"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    {!isLogin && (
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text" required={!isLogin} placeholder="Full Identity"
                          className={inputClasses} value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email" required placeholder="Email Address"
                        className={inputClasses} value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        disabled={isLoading}
                      />
                    </div>
                    {!isLogin && (
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="tel" required={!isLogin} placeholder="Phone Contact"
                          className={inputClasses} value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required placeholder="Security Credential"
                        className={inputClasses} value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isLogin && (
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[10px] text-gray-500 hover:text-blue-400 font-bold uppercase tracking-widest transition-colors"
                          disabled={isLoading}
                        >
                          Recover Password
                        </button>
                      </div>
                    )}
                    <button
                      type="submit" disabled={isLoading}
                      className="w-full btn-premium py-4 px-6 rounded-2xl text-white font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all mt-4"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{isLogin ? 'Establish Session' : 'Create Profile'} <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {!isForgotPassword && !isOtpPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-10"
              >
                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                  <div className="relative flex justify-center text-[9px] uppercase font-black tracking-[0.3em]"><span className="bg-[#030712] px-4 text-gray-500 rounded-full">Verification</span></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => triggerSocialLogin('google')} disabled={isLoading}
                    className="flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all uppercase tracking-widest disabled:opacity-50"
                  >
                    Google
                  </button>
                  <button
                    onClick={() => triggerSocialLogin('apple')} disabled={isLoading}
                    className="flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all uppercase tracking-widest disabled:opacity-50"
                  >
                    Apple
                  </button>
                </div>
                <div className="mt-10 text-center">
                  <button
                    onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }}
                    disabled={isLoading}
                    className="text-gray-500 hover:text-blue-400 transition-colors text-[10px] font-black uppercase tracking-[0.25em] disabled:opacity-50"
                  >
                    {isLogin ? "Request Access Protocol" : "Back to Authenticator"}
                  </button>
                </div>
              </motion.div>
            )}

            {isForgotPassword && (
               <div className="mt-10 text-center">
                <button
                  onClick={() => setIsForgotPassword(false)}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-blue-400 transition-colors text-[10px] font-black uppercase tracking-[0.25em] disabled:opacity-50"
                >
                  Return to Authenticator
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
