import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Bot, User, Activity, Trash2 } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';
import { useWorkoutStore } from '../store/useWorkoutStore';
import { useProgressStore } from '../store/useProgressStore';
import { useNutritionStore } from '../store/useNutritionStore';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { generateCoachResponse, CoachContext } from '../engine/hybridCoach';
import { fetchChatAnswer } from '../lib/api';

export default function ChatPage() {
  const profile = useUserStore(s => s.profile);
  const workoutPlan = useWorkoutStore(s => s.currentPlan);
  const dietPlan = useNutritionStore(s => s.currentPlan);
  const token = useAuthStore(s => s.token);
  const { entries, prs } = useProgressStore();
  const waterLogKey = `fitai_water_${new Date().toISOString().slice(0, 10)}`;
  const savedWater = typeof localStorage !== 'undefined' ? localStorage.getItem(waterLogKey) : null;
  const todayWater = savedWater === null ? undefined : Number(savedWater);

  const { messages, addMessage, clear } = useChatStore();

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting once, even in React StrictMode / hydration replays
  useEffect(() => {
    if (messages.some(msg => msg.id === 'init-1')) return;

    addMessage({
      id: 'init-1',
      role: 'assistant',
      content: "Hey there! I'm your hybrid AI coach. I analyze your logged workouts, sleep, and nutrition to give you personalized coaching based on sports science rules and your data. What do you need help with today?",
      createdAt: new Date().toISOString()
    });
  }, [messages, addMessage]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || isTyping) return;

    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content: question,
      createdAt: new Date().toISOString()
    });
    
    setInput('');
    setIsTyping(true);
    const recentHistory = messages.slice(-8).map(({ role, content }) => ({ role, content }));

    const context: CoachContext = {
      profile,
      workoutPlan,
      dietPlan,
      progressEntries: entries,
      prs: prs,
      todayWater: todayWater ?? 0,
      conversationHistory: recentHistory,
    };

    setTimeout(async () => {
      let responseContent: string;
      let responseSources: string[] = [];
      let responseReferences: string[] = [];
      let followUpQuestions: string[] = [];
      try {
        const result = await fetchChatAnswer({
          message: question,
          profile,
          workoutPlan,
          dietPlan,
          history: recentHistory,
          progressEntries: entries,
          prs,
          todayWater,
        }, token);
        responseContent = result.answer;
        responseSources = result.sources ?? [];
        responseReferences = result.references ?? [];
        followUpQuestions = result.followUpQuestions ?? [];
      } catch {
        responseContent = generateCoachResponse(question, context);
      }
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        sources: responseSources,
        references: responseReferences,
        followUpQuestions,
        createdAt: new Date().toISOString()
      });
      setIsTyping(false);
    }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex h-[calc(100dvh-10rem)] min-h-0 w-full max-w-[1600px] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#07111d]/90 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.9)] backdrop-blur-xl lg:h-[calc(100dvh-3rem)]"
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-500/20">
            <MessageCircle className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-300/90">Hybrid Architecture</div>
            <h1 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">AI Coach</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={clear}
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-300 transition hover:bg-white/10 hover:text-white sm:flex"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-200">
            <Activity className="h-3.5 w-3.5 text-emerald-400" />
            Systems Online
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div
          ref={chatContainerRef}
          className="h-full overflow-y-auto px-3 py-5 sm:px-6 lg:px-8 custom-scrollbar"
        >
          <div className="mx-auto w-full max-w-[1280px] space-y-5">
            <div className="mb-2 flex flex-wrap gap-2">
              {[
                'Give me a back workout',
                'Meal ideas for fat loss',
                'How do I recover faster?',
                'What should I eat today?'
              ].map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_8px_20px_-8px_rgba(59,130,246,0.9)]">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[84%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${msg.role === 'user' ? 'justify-end text-violet-300' : 'text-slate-500'}`}>
                    <span>{msg.role === 'user' ? 'You' : 'FitCoach AI'}</span>
                    <span className="text-slate-600">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(msg.createdAt))}
                    </span>
                  </div>

                  <div
                    className={`rounded-[24px] px-5 py-4 text-[15px] leading-8 shadow-[0_15px_30px_-20px_rgba(15,23,42,0.9)] md:text-[17px] ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 text-white rounded-tr-md'
                        : 'border border-white/5 bg-slate-900/80 text-slate-200 rounded-tl-md'
                    }`}
                  >
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-2' : ''}>
                        {line.includes('**') ? (
                          <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-white">$1</strong>') }} />
                        ) : (
                          line
                        )}
                      </p>
                    ))}
                  </div>
                  {msg.role === 'assistant' && !!msg.sources?.length && (
                    <div className="mt-2 space-y-1 text-[10px] leading-relaxed text-slate-500">
                      <p>Sources: {msg.sources.join(', ')}</p>
                      {!!msg.references?.length && <p>References: {msg.references.join(' · ')}</p>}
                    </div>
                  )}
                  {msg.role === 'assistant' && !!msg.followUpQuestions?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.followUpQuestions.map(prompt => (
                        <button key={prompt} type="button" onClick={() => setInput(prompt)} className="min-h-10 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2 text-left text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/10">
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_8px_20px_-8px_rgba(99,102,241,0.9)]">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_8px_20px_-8px_rgba(59,130,246,0.9)]">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="max-w-[84%] items-start">
                  <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    <span>FitCoach AI</span>
                  </div>
                  <div className="flex h-12 items-center gap-2 rounded-[22px] rounded-tl-md border border-white/5 bg-slate-900/80 px-4 py-3 shadow-[0_15px_30px_-20px_rgba(15,23,42,0.9)]">
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: '0ms' }} />
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: '150ms' }} />
                    <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-cyan-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-slate-950/60 px-3 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="relative flex items-center rounded-[24px] border border-slate-700/80 bg-slate-900/80 p-2 shadow-[0_25px_40px_-20px_rgba(59,130,246,0.28)]">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your workout, diet, or recovery..."
              className="w-full bg-transparent px-4 py-4 text-base font-medium text-white placeholder:text-slate-500 outline-none md:text-lg"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="ml-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_12px_30px_-12px_rgba(59,130,246,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Powered by Context-Aware Hybrid Rules Engine
          </p>
        </div>
      </div>
    </motion.div>
  );
}
