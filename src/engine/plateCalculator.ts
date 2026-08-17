export function calculatePlates(targetWeight: number, barWeight: number = 20) {
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  
  if (targetWeight <= barWeight) {
    return { plates: [], perSide: [] };
  }

  let remainingWeight = (targetWeight - barWeight) / 2;
  const platesPerSide: { weight: number, count: number }[] = [];

  for (const plate of availablePlates) {
    if (remainingWeight >= plate) {
      const count = Math.floor(remainingWeight / plate);
      platesPerSide.push({ weight: plate, count });
      remainingWeight -= plate * count;
    }
  }

  const allPlates = platesPerSide.map(p => ({ weight: p.weight, count: p.count * 2 }));

  return { plates: allPlates, perSide: platesPerSide };
}
