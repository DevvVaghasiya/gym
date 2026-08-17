import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, LayoutDashboard, Target, Utensils, Settings, MessageCircle, Menu, X } from 'lucide-react';

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Dumbbell, label: 'Workout', path: '/workout' },
    { icon: Utensils, label: 'Nutrition', path: '/nutrition' },
    { icon: Target, label: 'Progress', path: '/progress' },
    { icon: MessageCircle, label: 'Coach', path: '/coach' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="flex h-screen bg-[#030712] font-sans text-gray-200 overflow-hidden relative selection:bg-blue-500/30">
      {/* Global Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-transparent rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-gradient-to-tr from-purple-600/10 via-pink-600/5 to-transparent rounded-full blur-[120px] mix-blend-screen animate-pulse-glow pointer-events-none" style={{ animationDelay: '2s' }} />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay z-0"></div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-20 px-6 flex items-center justify-between z-30 backdrop-blur-md bg-slate-950/50 border-b border-white/5">
        <div className="flex items-center gap-3 text-white font-extrabold text-xl tracking-tighter">
          <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span>FitAI</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10"
        >
          <Menu className="w-6 h-6 text-gray-300" />
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
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{
          x: (typeof window !== 'undefined' && window.innerWidth < 1024)
            ? (isSidebarOpen ? 0 : -300)
            : 0
        }}
        className={`fixed lg:relative top-0 bottom-0 left-0 w-72 backdrop-blur-3xl bg-slate-900/40 border-r border-white/5 flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white font-extrabold text-2xl tracking-tighter">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-[0_8px_16px_-4px_rgba(59,130,246,0.5)]">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span>Fit<span className="text-blue-500">AI</span></span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/10"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-5 py-3.5 rounded-2xl transition-all duration-300 font-semibold text-sm ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-xl shadow-black/20 ring-1 ring-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-gray-500'} transition-colors duration-300`} />
                  {item.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 p-[2px]">
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
                <span className="font-bold text-xs">JD</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">John Doe</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Pro Athlete</p>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-10 mt-20 lg:mt-0 relative z-10 custom-scrollbar">
        <div className="w-full max-w-[1400px] mx-auto h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
