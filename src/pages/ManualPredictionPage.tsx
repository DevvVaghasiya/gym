import { useState } from 'react';
import { fetchMlRecommendation } from '../lib/api';

const defaultForm = {
  age: 28,
  gender: 'male',
  heightCm: 176,
  weightKg: 74,
  bodyFatPercent: 18,
  experience: 'intermediate',
  goal: 'muscle_gain',
  daysPerWeek: 4,
  activityLevel: 'moderate',
  sleepHours: 7,
  stressLevel: 'medium',
  workoutDuration: 60,
};

export default function ManualPredictionPage() {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleChange = (key: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        ...form,
        age: Number(form.age),
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        bodyFatPercent: Number(form.bodyFatPercent),
        daysPerWeek: Number(form.daysPerWeek),
        workoutDuration: Number(form.workoutDuration),
        sleepHours: Number(form.sleepHours),
      };

      const prediction = await fetchMlRecommendation(payload);
      setResult(prediction);
    } catch (err: any) {
      setError(err.message || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-400">Manual Prediction</p>
          <h1 className="mt-3 text-3xl font-bold">Test trained gym model</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-300">
                Age
                <input type="number" value={form.age} onChange={(e) => handleChange('age', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-gray-300">
                Gender
                <select value={form.gender} onChange={(e) => handleChange('gender', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </label>

              <label className="text-sm text-gray-300">
                Height (cm)
                <input type="number" value={form.heightCm} onChange={(e) => handleChange('heightCm', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-gray-300">
                Weight (kg)
                <input type="number" value={form.weightKg} onChange={(e) => handleChange('weightKg', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-gray-300">
                Body fat %
                <input type="number" step="0.1" value={form.bodyFatPercent} onChange={(e) => handleChange('bodyFatPercent', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-gray-300">
                Experience
                <select value={form.experience} onChange={(e) => handleChange('experience', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label className="text-sm text-gray-300">
                Goal
                <select value={form.goal} onChange={(e) => handleChange('goal', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
                  <option value="fat_loss">Fat Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="recomposition">Recomposition</option>
                  <option value="strength">Strength</option>
                </select>
              </label>

              <label className="text-sm text-gray-300">
                Days / week
                <input type="number" value={form.daysPerWeek} onChange={(e) => handleChange('daysPerWeek', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-gray-300">
                Activity
                <select value={form.activityLevel} onChange={(e) => handleChange('activityLevel', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                  <option value="athlete">Athlete</option>
                </select>
              </label>

              <label className="text-sm text-gray-300">
                Sleep hours
                <input type="number" step="0.5" value={form.sleepHours} onChange={(e) => handleChange('sleepHours', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-gray-300">
                Stress
                <select value={form.stressLevel} onChange={(e) => handleChange('stressLevel', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="text-sm text-gray-300 md:col-span-2">
                Workout duration (minutes)
                <input type="number" value={form.workoutDuration} onChange={(e) => handleChange('workoutDuration', e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Predicting...' : 'Predict plan'}
            </button>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          </form>

          <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-6">
            <h2 className="text-xl font-semibold">Prediction result</h2>
            {!result && !loading && <p className="mt-6 text-sm text-gray-400">Your trained model output will appear here after you submit a profile.</p>}

            {result && (
              <div className="mt-6 space-y-4 text-sm">
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="text-gray-400">Strategy</p>
                  <p className="text-xl font-bold text-blue-300">{result.strategy}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="text-gray-400">Split</p>
                  <p className="text-xl font-bold text-green-300">{result.split}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="text-gray-400">Calories</p>
                  <p className="text-xl font-bold text-orange-300">{result.calories} kcal</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="text-gray-400">Protein target</p>
                  <p className="text-xl font-bold text-pink-300">{result.protein} g</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-4">
                  <p className="text-gray-400">Workout days</p>
                  <p className="text-xl font-bold text-yellow-300">{result.workoutPlan?.days?.length || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
