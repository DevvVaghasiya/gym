const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/$/, '');
  }

  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return ''; // Use same-origin requests if no API URL is configured
  }

  return 'http://localhost:3000';
};

export const API_BASE = getApiBase();

export async function fetchMlRecommendation(profile: unknown) {
  const res = await fetch(`${API_BASE}/api/ml/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('ML service unavailable');
  return res.json();
}

export async function saveUserProfile(profile: Record<string, unknown>, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/users/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profile),
  });

  if (!res.ok) throw new Error('Failed to save onboarding profile');
  return res.json();
}

export async function saveOnboardingResult(payload: Record<string, unknown>, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/onboarding/save`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to save onboarding result');
  return res.json();
}

export async function fetchChatAnswer(payload: {
  message: string;
  profile?: unknown;
  workoutPlan?: unknown;
  dietPlan?: unknown;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  progressEntries?: unknown[];
  prs?: unknown[];
  todayWater?: number;
}, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Chat service unavailable');
  return res.json() as Promise<{
    answer: string;
    intent: string;
    topic?: string | null;
    category?: string;
    answerType?: string;
    safetyLevel?: string;
    sources: string[];
    references?: string[];
    relatedTopics?: string[];
    followUpQuestions?: string[];
    usedPlanData: boolean;
  }>;
}

export type ProgressLogPayload = {
  date: string;
  weightKg: number;
  bodyFatPercent?: number;
  muscleMassPercent?: number;
  notes?: string;
};

export type DailyStatsPayload = {
  date: string;
  waterIntakeLiters: number;
  meals: Array<{
    id: string;
    time?: string;
    name?: string;
    logged?: boolean;
    skipped?: boolean;
  }>;
};

export async function fetchDailyStats(token?: string | null, date = new Date().toISOString().slice(0, 10)) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/daily-stats?date=${encodeURIComponent(date)}`, { headers });
  if (!res.ok) throw new Error('Failed to load daily stats');
  return res.json() as Promise<DailyStatsPayload>;
}

export async function saveDailyStats(payload: DailyStatsPayload, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/daily-stats`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error('Failed to save daily stats');
  return res.json();
}

export async function fetchProgressEntries(token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/progress`, { headers });
  if (!res.ok) throw new Error('Failed to load progress history');
  return res.json() as Promise<ProgressLogPayload[]>;
}

export async function saveProgressEntry(entry: ProgressLogPayload, token?: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/progress`, {
    method: 'POST',
    headers,
    body: JSON.stringify(entry),
  });

  if (!res.ok) throw new Error('Failed to save progress entry');
  return res.json();
}
