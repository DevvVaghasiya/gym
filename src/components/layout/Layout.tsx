import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, LayoutDashboard, Target, Utensils, Settings, MessageCircle, Menu, X } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const profile = useUserStore(state => state.profile);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Dumbbell, label: 'Workout', path: '/workout' },
    { icon: Utensils, label: 'Nutrition', path: '/nutrition' },
    { icon: Target, label: 'Progress', path: '/progress' },
    { icon: MessageCircle, label: 'Coach', path: '/coach' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#070B14] font-sans text-slate-100 selection:bg-cyan-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(103,232,249,0.08),_transparent_35%)]" />
      <div className="absolute top-[-12%] left-[-8%] h-[26rem] w-[26rem] rounded-full bg-blue-500/10 blur-[120px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-8%] h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 pt-[env(safe-area-inset-top)] px-5 flex items-center justify-between z-30 backdrop-blur-md bg-slate-950/80 border-b border-white/5">
        <div className="flex items-center gap-2.5 text-white font-extrabold text-lg tracking-tighter">
          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Dumbbell className="w-4 h-4 text-white" />
          </div>
          <span>Fit<span className="text-blue-400">AI</span></span>
        </div>
        <button
          aria-label="Open navigation menu"
          aria-expanded={isSidebarOpen}
          aria-controls="primary-navigation"
          onClick={() => setIsSidebarOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 transition hover:bg-white/10"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        id="primary-navigation"
        initial={false}
        animate={{
          x: isMobile ? (isSidebarOpen ? 0 : -300) : 0,
        }}
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-[256px] shrink-0 flex-col border-r border-white/10 bg-slate-950/90 backdrop-blur-2xl shadow-[0_0_40px_rgba(15,23,42,0.65)] transition-transform duration-300 lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-5 pt-[calc(1.75rem+env(safe-area-inset-top,0px))]">
          <div className="flex items-center gap-3 text-white font-extrabold text-2xl tracking-tighter">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 shadow-[0_12px_30px_-10px_rgba(59,130,246,0.8)]">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="leading-none">Fit<span className="text-blue-400">AI</span></div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Coach</div>
            </div>
          </div>
          <button
            aria-label="Close navigation menu"
            onClick={() => setIsSidebarOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 lg:hidden"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <nav className="mt-3 flex-1 space-y-2 px-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/10 text-white shadow-[0_0_20px_-5px_rgba(59,130,246,0.3),inset_0_0_0_1px_rgba(96,165,250,0.2)]'
                    : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`absolute inset-y-1 left-1 w-0.5 rounded-full ${isActive ? 'bg-blue-400' : 'bg-transparent'}`} />
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="ml-auto h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.9)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex items-center gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-3.5 shadow-[0_20px_40px_-20px_rgba(59,130,246,0.6)]">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-black text-white shadow-[0_12px_25px_-12px_rgba(59,130,246,0.9)] overflow-hidden">
              {profile?.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.name ? profile.name.charAt(0).toUpperCase() : 'JD'
              )}
              <span className="absolute -bottom-1 -right-1 z-10 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{profile?.name || 'John Doe'}</p>
              <div className="mt-1 flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-blue-400">
                <span className="truncate">{profile?.goal ? profile.goal.replace('_', ' ') : 'Athlete'}</span>
                <span className="flex-shrink-0 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[8px] text-blue-300">Online</span>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main ref={mainRef} className="fixed inset-x-0 top-16 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 min-w-0 overflow-y-auto px-3 py-4 sm:px-5 custom-scrollbar lg:relative lg:inset-auto lg:flex-1 lg:px-6 lg:py-6">
        <div className="mx-auto h-full w-full max-w-[1440px]">
          <div className="mx-auto w-full max-w-[1360px]">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile App Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex min-h-16 items-center justify-around border-t border-white/10 bg-slate-950/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_25px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-1.5 transition-all duration-200 ${
                isActive ? 'text-blue-400 scale-105 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-400'}`} />
                <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
