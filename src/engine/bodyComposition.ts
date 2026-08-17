import type { UserProfile, Goal, Gender, GymType, ActivityLevel, FoodPreference } from '../types/user';

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return heightM > 0 ? weightKg / (heightM * heightM) : 0;
}

export function calculateLBM(weightKg: number, bodyFatPercent: number): number {
  return weightKg * (1 - bodyFatPercent / 100);
}

export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  // Mifflin-St Jeor equation
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

export function getActivityMultiplier(activityLevel: ActivityLevel): number {
  switch (activityLevel) {
    case 'sedentary': return 1.2;
    case 'light': return 1.375;
    case 'moderate': return 1.55;
    case 'heavy': return 1.725;
    case 'athlete': return 1.9;
    default: return 1.55;
  }
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel, jobType?: string, dailySteps?: number): number {
  let factor = getActivityMultiplier(activityLevel);
  if (jobType === 'physical') factor = Math.max(factor, 1.55);
  else if (jobType === 'sitting' && factor > 1.375 && (dailySteps || 0) < 5000) factor = Math.min(factor, 1.375);
  return bmr * factor;
}

export function calculateDailyCalories(tdee: number, goal: Goal): number {
  switch (goal) {
    case 'fat_loss': return tdee - 500;
    case 'muscle_gain': return tdee + 300;
    case 'strength': return tdee + 250;
    case 'powerlifting': return tdee + 350;
    case 'athletic': return tdee + 150;
    case 'endurance': return tdee + 100;
    case 'recomposition': return tdee;
    default: return tdee;
  }
}

export function calculateMacros(dailyCalories: number, weightKg: number, goal: Goal): { protein: number, carbs: number, fat: number, fiber: number, sugar: number } {
  let proteinPerKg = 1.8;
  let fatPercentage = 0.25;

  switch (goal) {
    case 'fat_loss':
      proteinPerKg = 2.2;
      fatPercentage = 0.22;
      break;
    case 'muscle_gain':
      proteinPerKg = 2.0;
      fatPercentage = 0.25;
      break;
    case 'strength':
    case 'powerlifting':
      proteinPerKg = 2.1;
      fatPercentage = 0.28;
      break;
    case 'athletic':
      proteinPerKg = 1.9;
      fatPercentage = 0.25;
      break;
    case 'endurance':
      proteinPerKg = 1.6;
      fatPercentage = 0.25;
      break;
    case 'recomposition':
    default:
      proteinPerKg = 2.0;
      fatPercentage = 0.25;
      break;
  }

  const protein = weightKg * proteinPerKg;
  const fat = (dailyCalories * fatPercentage) / 9;
  const carbs = (dailyCalories - (protein * 4) - (fat * 9)) / 4;
  
  // Fiber: roughly 14g per 1000 calories
  const fiber = (dailyCalories / 1000) * 14;
  
  // Sugar: keep below 10% of total calories (converted to grams: 4 kcal/g)
  const sugar = (dailyCalories * 0.08) / 4;

  return {
    protein: Math.round(protein),
    carbs: Math.max(0, Math.round(carbs)),
    fat: Math.round(fat),
    fiber: Math.round(fiber),
    sugar: Math.round(sugar)
  };
}

export function computeProteinRange(weightKg: number, goal: Goal): { min: number; max: number } {
  switch (goal) {
    case 'muscle_gain': return { min: Math.round(1.6 * weightKg), max: Math.round(2.2 * weightKg) };
    case 'fat_loss': return { min: Math.round(2.0 * weightKg), max: Math.round(2.5 * weightKg) };
    case 'strength':
    case 'powerlifting':
      return { min: Math.round(1.8 * weightKg), max: Math.round(2.4 * weightKg) };
    default: return { min: Math.round(1.4 * weightKg), max: Math.round(1.8 * weightKg) };
  }
}

export function calculateWaterIntake(weightKg: number, activityLevel: ActivityLevel, sleepHours: number): number {
  let baseWater = weightKg * 0.033; // 33ml per kg
  
  // Adjust based on activity
  if (activityLevel === 'heavy' || activityLevel === 'athlete') baseWater += 1.0;
  else if (activityLevel === 'moderate') baseWater += 0.5;
  
  // Sleep adjustment
  if (sleepHours < 6) baseWater += 0.3; // poor sleep recovery requires hydration

  return Math.round(baseWater * 10) / 10;
}

export interface AdvancedDiagnostics {
  bodyType: 'Ectomorph' | 'Mesomorph' | 'Endomorph';
  skinnyFat: boolean;
  obesityLevel: 'Underweight' | 'Normal' | 'Overweight' | 'Obese Class I' | 'Obese Class II';
  weakMuscleGroups: string[];
  strongMuscleGroups: string[];
  muscularImbalances: string[];
  postureIssues: string[];
  recoveryCapability: 'Low' | 'Medium' | 'High' | 'Elite';
  injuryRisk: 'Low' | 'Moderate' | 'High';
  timelineWeeks: number;
  timelineConfidence: number;
  est1RMBenchPressKg: number;
  est1RMSquatKg: number;
  est1RMDeadliftKg: number;
}

export function performAdvancedDiagnostics(profile: UserProfile): AdvancedDiagnostics {
  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  
  // Body Type logic
  let bodyType: 'Ectomorph' | 'Mesomorph' | 'Endomorph' = 'Mesomorph';
  if (profile.gender === 'male') {
    if (profile.bodyFatPercent < 12 && bmi < 21) bodyType = 'Ectomorph';
    else if (profile.bodyFatPercent > 18 || bmi > 26) bodyType = 'Endomorph';
  } else {
    if (profile.bodyFatPercent < 18 && bmi < 19) bodyType = 'Ectomorph';
    else if (profile.bodyFatPercent > 26 || bmi > 25) bodyType = 'Endomorph';
  }

  // Skinny Fat logic
  const skinnyFat = (profile.bodyFatPercent > (profile.gender === 'male' ? 19 : 26)) && (bmi >= 18.5 && bmi < 24);

  // Obesity Level
  let obesityLevel: 'Underweight' | 'Normal' | 'Overweight' | 'Obese Class I' | 'Obese Class II' = 'Normal';
  if (bmi < 18.5) obesityLevel = 'Underweight';
  else if (bmi >= 25 && bmi < 30) obesityLevel = 'Overweight';
  else if (bmi >= 30 && bmi < 35) obesityLevel = 'Obese Class I';
  else if (bmi >= 35) obesityLevel = 'Obese Class II';

  // Weak/Strong Muscle Groups based on goal & injuries
  const weakMuscleGroups = ['Core'];
  const strongMuscleGroups = ['Quads'];
  
  if (profile.goal === 'muscle_gain') {
    weakMuscleGroups.push('Chest', 'Back');
  } else if (profile.goal === 'fat_loss') {
    weakMuscleGroups.push('Shoulders');
  }

  if (profile.injuries.some(i => i.toLowerCase().includes('knee') || i.toLowerCase().includes('squat'))) {
    weakMuscleGroups.push('Hamstrings', 'Glutes');
    strongMuscleGroups.push('Calves');
  }
  if (profile.injuries.some(i => i.toLowerCase().includes('shoulder') || i.toLowerCase().includes('rotator'))) {
    weakMuscleGroups.push('Rear Delts', 'Rotator Cuff');
  }

  // Posture Issues
  const postureIssues: string[] = [];
  if (profile.occupation.toLowerCase().includes('desk') || profile.occupation.toLowerCase().includes('office') || profile.occupation.toLowerCase().includes('student')) {
    postureIssues.push('Forward Head Posture', 'Rounded Shoulders (Kyphosis)');
  }
  if (profile.injuries.some(i => i.toLowerCase().includes('back') || i.toLowerCase().includes('spine'))) {
    postureIssues.push('Anterior Pelvic Tilt');
  }
  if (postureIssues.length === 0) {
    postureIssues.push('Neutral Alignment');
  }

  // Muscular Imbalances
  const muscularImbalances: string[] = [];
  if (profile.experience === 'beginner') {
    muscularImbalances.push('Dominant Quads vs Weak Hamstrings', 'Push vs Pull Strength Ratio Imbalance');
  } else if (profile.injuries.length > 0) {
    muscularImbalances.push('Unilateral Left/Right Strength Imbalance due to previous Injury');
  } else {
    muscularImbalances.push('Minor Scapular Winging');
  }

  // Recovery Capability
  let recoveryScore = 0;
  if (profile.sleepHours >= 8) recoveryScore += 2;
  else if (profile.sleepHours >= 7) recoveryScore += 1;
  if (profile.stressLevel === 'low') recoveryScore += 2;
  else if (profile.stressLevel === 'medium') recoveryScore += 1;
  if (profile.alcoholConsumption === 'none') recoveryScore += 1;
  if (!profile.smokingHabit) recoveryScore += 1;

  let recoveryCapability: 'Low' | 'Medium' | 'High' | 'Elite' = 'Medium';
  if (recoveryScore >= 5) recoveryCapability = 'Elite';
  else if (recoveryScore >= 4) recoveryCapability = 'High';
  else if (recoveryScore <= 1) recoveryCapability = 'Low';

  // Injury Risk
  let injuryRisk: 'Low' | 'Moderate' | 'High' = 'Low';
  const riskFactors = profile.injuries.length + profile.mobilityIssues.length + profile.previousSurgeries.length;
  if (riskFactors >= 3 || (profile.stressLevel === 'high' && profile.sleepHours < 6)) {
    injuryRisk = 'High';
  } else if (riskFactors >= 1) {
    injuryRisk = 'Moderate';
  }

  // Estimated 1RMs
  const bw = profile.weightKg;
  let benchMultiplier = profile.gender === 'male' ? 0.8 : 0.4;
  let squatMultiplier = profile.gender === 'male' ? 1.0 : 0.6;
  let deadliftMultiplier = profile.gender === 'male' ? 1.2 : 0.8;

  if (profile.experience === 'intermediate') {
    benchMultiplier *= 1.3;
    squatMultiplier *= 1.3;
    deadliftMultiplier *= 1.3;
  } else if (profile.experience === 'advanced') {
    benchMultiplier *= 1.6;
    squatMultiplier *= 1.6;
    deadliftMultiplier *= 1.6;
  }

  const est1RMBenchPressKg = Math.round((bw * benchMultiplier) / 2.5) * 2.5;
  const est1RMSquatKg = Math.round((bw * squatMultiplier) / 2.5) * 2.5;
  const est1RMDeadliftKg = Math.round((bw * deadliftMultiplier) / 2.5) * 2.5;

  // Timeline for goal completion
  const diff = Math.abs(profile.weightKg - profile.goalWeightKg);
  let timelineWeeks = 12; // default
  let timelineConfidence = 85;

  if (profile.goal === 'fat_loss') {
    // Healthy weight loss is 0.5 - 1kg per week
    timelineWeeks = Math.max(4, Math.round(diff / 0.7));
  } else if (profile.goal === 'muscle_gain') {
    // Healthy muscle gain is 0.2 - 0.4kg per week
    timelineWeeks = Math.max(6, Math.round(diff / 0.25));
  }

  // Lower confidence if stress high, sleep low, or previous injuries present
  if (profile.stressLevel === 'high') {
    timelineConfidence -= 10;
    timelineWeeks = Math.round(timelineWeeks * 1.2);
  }
  if (profile.sleepHours < 6) {
    timelineConfidence -= 8;
    timelineWeeks = Math.round(timelineWeeks * 1.15);
  }

  return {
    bodyType,
    skinnyFat,
    obesityLevel,
    weakMuscleGroups,
    strongMuscleGroups,
    muscularImbalances,
    postureIssues,
    recoveryCapability,
    injuryRisk,
    timelineWeeks,
    timelineConfidence: Math.max(50, timelineConfidence),
    est1RMBenchPressKg,
    est1RMSquatKg,
    est1RMDeadliftKg
  };
}

export function calculateAllMetrics(profile: UserProfile) {
  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const lbm = calculateLBM(profile.weightKg, profile.bodyFatPercent);
  const bmr = calculateBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel, profile.jobType, profile.dailySteps);
  const maintenance = Math.round(tdee);

  const dailyCalories = calculateDailyCalories(tdee, profile.goal);
  const macros = calculateMacros(dailyCalories, profile.weightKg, profile.goal);
  
  const proteinRange = computeProteinRange(profile.weightKg, profile.goal);
  
  const bulkLean = Math.round(tdee + 250);
  const bulkAggressive = Math.round(tdee + 500);
  const cutSlow = Math.round(tdee - 300);
  const cutFast = Math.round(tdee - 500);

  const safe = (v: any) => Number.isFinite(v) ? v : 0;

  return {
    bmi: safe(bmi),
    lbm: safe(lbm),
    bmr: safe(bmr),
    tdee: safe(tdee),
    maintenance: safe(maintenance),
    dailyCalories: safe(dailyCalories),
    macros: {
      protein: safe(macros.protein),
      carbs: safe(macros.carbs),
      fat: safe(macros.fat),
      fiber: safe(macros.fiber),
      sugar: safe(macros.sugar)
    },
    proteinRange,
    recommendations: {
      bulk: { lean: bulkLean, aggressive: bulkAggressive },
      cut: { slow: cutSlow, fast: cutFast }
    },
    waterIntakeLiters: calculateWaterIntake(profile.weightKg, profile.activityLevel, profile.sleepHours),
  };
}
