import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Cpu, ChevronRight, User, Trash2, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useChatStore } from '../store/useChatStore';
import { answerGymQuestion } from '../engine/chatEngine';
import { fetchChatAnswer } from '../lib/api';

const SUGGESTIONS = [
  'How many calories should I eat?',
  'How much protein do I need?',
  'Can I replace barbell bench press?',
  'I missed my leg workout today. What should I do?',
];

export default function ChatPage() {
  const profile = useUserStore(s => s.profile);
  const workoutPlan = useWorkoutStore(s => s.currentPlan);
  const dietPlan = useNutritionStore(s => s.currentPlan);
  const { messages, addMessage, clear } = useChatStore();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, busy]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    addMessage({ id: 'u_' + Date.now(), role: 'user', content: q, createdAt: new Date().toISOString() });
    setBusy(true);
    try {
      let result;
      try {
        result = await fetchChatAnswer({ message: q, profile, workoutPlan, dietPlan });
      } catch {
        result = answerGymQuestion(q, { profile, workoutPlan, dietPlan });
      }
      addMessage({
        id: 'a_' + Date.now(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        createdAt: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto h-full flex flex-col min-h-0 overflow-hidden"
    >
      <header className="flex items-center justify-between pb-6 border-b border-white/5 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-blue-500" />
            Neural Coach
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI-powered fitness intelligence.</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clear}
            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold flex items-center gap-2 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Reset
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto pr-4 space-y-8 custom-scrollbar min-h-0">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[300px] text-center mt-10"
            >
              <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <Cpu className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">System Online</h2>
              <p className="text-gray-500 text-sm max-w-md mb-8">
                Ask about your macros, request exercise substitutions, or get advice on managing fatigue and recovery.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-left text-sm font-medium text-gray-300 hover:text-white hover:bg-blue-500/10 hover:border-blue-500/30 transition-all flex items-center justify-between group"
                  >
                    <span>{s}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-blue-400" />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            messages.map(m => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    m.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-slate-800 border border-white/10'
                  }`}>
                    {m.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Cpu className="w-5 h-5 text-blue-400" />}
                  </div>
                  
                  <div className={`rounded-[2rem] px-6 py-5 ${
                    m.role === 'user' 
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl shadow-indigo-500/20' 
                      : 'bg-white/[0.02] border border-white/5 text-gray-200'
                  }`}>
                    {m.role === 'assistant' ? (
                      <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm font-medium">{m.content}</p>
                    )}
                    
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-2">
                        {m.sources.map((s, i) => (
                          <span key={i} className="text-[10px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg uppercase tracking-widest">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
        
        {busy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-14 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100" />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200" />
            </span>
            Processing Query...
          </motion.div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Stable Input Area */}
      <div className="pt-6 pb-2 flex-shrink-0">
        <form
          onSubmit={e => { e.preventDefault(); ask(input); }}
          className="relative flex gap-3 w-full"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-[2rem] px-8 py-5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all text-sm font-medium backdrop-blur-xl shadow-2xl"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="w-[60px] h-[60px] rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:grayscale transition-all shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-center text-[10px] text-gray-600 font-medium mt-3 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3 h-3" /> FitAI is an AI assistant, not a doctor.
        </p>
      </div>
    </motion.div>
  );
}
