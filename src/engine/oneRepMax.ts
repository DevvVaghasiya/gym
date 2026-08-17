export function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function brzycki1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (36 / (37 - reps));
}

export function estimate1RM(weight: number, reps: number): number {
  return Math.round((epley1RM(weight, reps) + brzycki1RM(weight, reps)) / 2);
}

export function getPercentageOfMax(oneRM: number, percentage: number): number {
  return Math.round((oneRM * (percentage / 100)) / 2.5) * 2.5;
}

export function getRepMaxTable(oneRM: number): { reps: number, weight: number }[] {
  const percentages = [100, 95, 93, 90, 87, 85, 83, 80, 77, 75, 73, 70];
  return percentages.map((percent, index) => ({
    reps: index + 1,
    weight: getPercentageOfMax(oneRM, percent)
  }));
}
