import type { UserProfile, Equipment, Experience, Goal, WorkoutSplit } from '../types/user';
import type { WorkoutPlan, WorkoutDay, Exercise, MuscleGroup } from '../types/workout';
import { EXERCISE_DATABASE } from '../data/exercises';
import { recommendWeight, computeGoalWeight } from './weightRecommender';
import { recommendSplit, weeklySetTargets, recommendStrategy } from './recommendationEngine';

export function selectExercises(
  muscleGroups: MuscleGroup[], 
  availableEquipment: Equipment[], 
  experience: Experience, 
  injuries: string[],
  count: number
): Exercise[] {
  // Filter by muscle groups, equipment, experience, injuries
  const valid = EXERCISE_DATABASE.filter(ex => 
    muscleGroups.includes(ex.muscleGroup) &&
    ex.equipment.some(eq => availableEquipment.includes(eq) || eq === 'bodyweight') &&
    ex.difficulty.includes(experience)
    // simplistic injury check omitted for MVP
  );

  // Separate compounds and isolations
  const compounds = valid.filter(e => e.type === 'compound');
  const isolations = valid.filter(e => e.type === 'isolation');

  // Prefer compounds first, then isolations
  const selected: Exercise[] = [];
  
  // Try to pick at least 1 compound per muscle group
  muscleGroups.forEach(mg => {
    const mgCompound = compounds.find(c => c.muscleGroup === mg && !selected.includes(c));
    if (mgCompound && selected.length < count) selected.push(mgCompound);
  });

  // Fill rest with isolations or more compounds
  const remaining = [...compounds, ...isolations].filter(e => !selected.includes(e));
  for (let i = 0; i < remaining.length && selected.length < count; i++) {
    selected.push(remaining[i]);
  }

  return selected;
}

export function calculateSetsReps(exercise: Exercise, goal: Goal, experience: Experience) {
  let sets = 3;
  let reps = 10;
  let restSeconds = 90;

  if (goal === 'strength' && exercise.type === 'compound') {
    sets = 5;
    reps = 5;
    restSeconds = 180;
  } else if (goal === 'fat_loss') {
    sets = 3;
    reps = 15;
    restSeconds = 60;
  } else if (goal === 'muscle_gain') {
    sets = exercise.type === 'compound' ? 4 : 3;
    reps = exercise.type === 'compound' ? 8 : 12;
    restSeconds = 90;
  }

  return { sets, reps, restSeconds };
}

export function generateWorkoutPlan(profile: UserProfile): WorkoutPlan {
  const days: WorkoutDay[] = [];
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const workoutDays = Math.min(Math.max(profile.daysPerWeek, 1), 6);

  const buildDay = (name: string, focus: string, muscleGroups: string[], exerciseCount: number, dayName: string) => {
    const exercises = selectExercises(muscleGroups as any, profile.availableEquipment, profile.experience, profile.injuries, exerciseCount);
    return {
      day: dayName,
      name,
      focus,
      isRestDay: false,
      exercises: exercises.map(ex => {
        const { sets, reps, restSeconds } = calculateSetsReps(ex, profile.goal, profile.experience);
        
        // Rich exercise description injection
        const enrichedExercise: Exercise = {
          ...ex,
          instructions: [
            `Initialize the exercise by setting up the safety pins and barbell/dumbbell height.`,
            `Lower the load slowly for 3 seconds (eccentric phase) while maintaining full muscular tension.`,
            `Pause briefly at the bottom to eliminate elastic bounce.`,
            `Push/Pull the weight back up forcefully (1 second concentric) while keeping your core braced.`
          ],
          coachingTips: [
            "Maintain a neutral cervical spine (keep neck aligned, don't look up or down).",
            "Actively squeeze the target muscle at the peak of the contraction.",
            "Drive your feet into the floor to activate leg drive and stabilizing muscle chains."
          ],
          commonMistakes: [
            "Using excessive weight, causing biomechanical breakdown and momentum lifting.",
            "Cutting the range of motion short (eg. partial squats or half-presses).",
            "Flaring the elbows out past 60 degrees, which places shear stress on the rotator cuffs."
          ],
          tempo: ex.type === 'compound' ? '3-0-1-0' : '2-0-1-1',
          estimatedCaloriesBurnedPerMin: ex.type === 'compound' ? 8 : 5,
          alternatives: {
            machine: 'Seated selectorized machine equivalent',
            dumbbell: 'Dumbbell equivalent variation',
            barbell: 'Barbell equivalent variation',
            cable: 'Cable pulley equivalent variation',
            bodyweight: 'Push-up / Bodyweight squat scaling'
          },
          image: `https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&q=80`,
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
        };

        return {
          exercise: enrichedExercise,
          sets,
          reps,
          restSeconds,
          recommendedWeight: recommendWeight(ex, profile),
          targetRPE: ex.type === 'compound' ? 8 : 9,
          tempo: enrichedExercise.tempo,
          estimatedCaloriesBurned: Math.round((ex.type === 'compound' ? 8 : 5) * (profile.workoutDuration / sets))
        };
      })
    };
  };

  const split: WorkoutSplit = profile.recommendedSplit || recommendSplit(profile).split;
  const strategy = profile.recommendedStrategy || recommendStrategy(profile).strategy;
  const volume = weeklySetTargets(profile, strategy);
  const extraCount = (groups: string[]) => {
    const map: Record<string, string> = { chest: 'chest', back: 'back', shoulders: 'shoulders', biceps: 'arms', triceps: 'arms', quads: 'legs', hamstrings: 'legs', glutes: 'legs', calves: 'legs', core: 'core' };
    const bump = groups.some(g => (volume[map[g] || g] || 10) >= 16);
    return bump ? 1 : 0;
  };

  const templates: Array<{ name: string; focus: string; groups: string[]; count: number }> = [];

  const push = { name: 'Push', focus: 'Chest, Shoulders, Triceps', groups: ['chest', 'shoulders', 'triceps'], count: 5 };
  const pull = { name: 'Pull', focus: 'Back, Biceps', groups: ['back', 'biceps'], count: 5 };
  const legs = { name: 'Legs', focus: 'Quads, Hamstrings, Glutes', groups: ['quads', 'hamstrings', 'glutes', 'calves'], count: 5 };
  const upper = { name: 'Upper', focus: 'Chest, Back, Shoulders, Arms', groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], count: 6 };
  const lower = { name: 'Lower', focus: 'Quads, Hamstrings, Glutes', groups: ['quads', 'hamstrings', 'glutes', 'calves'], count: 6 };
  const full = { name: 'Full Body', focus: 'Compounds across the whole body', groups: ['chest', 'back', 'quads', 'shoulders', 'hamstrings', 'core'], count: 6 };

  if (split === 'full_body' || workoutDays <= 2) {
    for (let i = 0; i < workoutDays; i++) templates.push({ ...full, count: full.count + extraCount(full.groups) });
  } else if (split === 'upper_lower') {
    const seq = [upper, lower, upper, lower, upper, lower];
    templates.push(...seq.slice(0, workoutDays).map(t => ({ ...t, count: t.count + extraCount(t.groups) })));
  } else if (split === 'ppl') {
    const seq = [push, pull, legs, push, pull, legs];
    templates.push(...seq.slice(0, workoutDays).map(t => ({ ...t, count: t.count + extraCount(t.groups) })));
  } else if (split === 'ppl_ul') {
    const seq = [push, pull, legs, upper, lower, { name: 'Specialization', focus: 'Lagging muscle extra volume', groups: ['shoulders', 'chest', 'back'], count: 5 }];
    templates.push(...seq.slice(0, workoutDays).map(t => ({ ...t, count: t.count + extraCount(t.groups) })));
  } else {
    const seq = [
      { name: 'Chest', focus: 'Chest hypertrophy', groups: ['chest', 'triceps'], count: 5 },
      { name: 'Back', focus: 'Back hypertrophy', groups: ['back', 'biceps'], count: 5 },
      { name: 'Legs', focus: 'Quad and glute focus', groups: ['quads', 'hamstrings', 'glutes', 'calves'], count: 6 },
      { name: 'Shoulders', focus: 'Delts and traps', groups: ['shoulders'], count: 5 },
      { name: 'Arms', focus: 'Biceps and triceps', groups: ['biceps', 'triceps'], count: 5 },
      legs,
    ];
    templates.push(...seq.slice(0, workoutDays));
  }

  const trainingIdx =
    workoutDays >= 6 ? [0, 1, 2, 3, 4, 5] :
    workoutDays === 5 ? [0, 1, 2, 3, 4] :
    workoutDays === 4 ? [0, 1, 3, 4] :
    workoutDays === 3 ? [0, 2, 4] :
    workoutDays === 2 ? [0, 3] : [0];

  const week: WorkoutDay[] = weekDays.map((dayName) => ({
    day: dayName,
    name: 'Rest Day',
    focus: 'Recovery',
    isRestDay: true,
    exercises: [],
  }));

  templates.slice(0, workoutDays).forEach((template, i) => {
    const dayIndex = trainingIdx[i] ?? i;
    week[dayIndex] = buildDay(template.name, template.focus, template.groups, template.count, weekDays[dayIndex]);
  });
  days.push(...week);

  return {
    id: 'plan_' + Date.now(),
    weekNumber: 1,
    goalWeightKg: computeGoalWeight(profile),
    days,
    createdAt: new Date().toISOString()
  };
}
