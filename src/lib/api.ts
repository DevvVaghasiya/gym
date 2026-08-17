export const API_BASE = 'http://localhost:3000';

export async function fetchMlRecommendation(profile: unknown) {
  const res = await fetch(`${API_BASE}/api/ml/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error('ML service unavailable');
  return res.json();
}

export async function fetchChatAnswer(payload: {
  message: string;
  profile?: unknown;
  workoutPlan?: unknown;
  dietPlan?: unknown;
}) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Chat service unavailable');
  return res.json() as Promise<{ answer: string; intent: string; sources: string[]; usedPlanData: boolean }>;
}
