const asset = (fileName: string) => new URL(`../../${fileName}`, import.meta.url).href;

export const EXERCISE_MACHINE_IMAGE_MAP: Record<string, string> = {
  bench_press: asset('bench-prress.jfif'),
  incline_db_press: asset('incline-dumbel.jfif'),
  chest_fly: asset('flat-fly.jfif'),
  cable_fly: asset('cable-fly.jfif'),
  push_ups: asset('pushup.png'),
  pushups: asset('pushup.png'),
  push_up: asset('pushup.png'),
  pushup: asset('pushup.png'),

  barbell_row: asset('barbell-row.jfif'),
  pull_up: asset('pull-up.jfif'),
  pullup: asset('pull-up.jfif'),
  lat_pulldown: asset('lat pulldown.jfif'),
  seated_cable_row: asset('cable-raws.jfif'),

  overhead_press: asset('overhead-press.jfif'),
  lateral_raise: asset('lateral-raise.jfif'),
  face_pull: asset('face-pull.jfif'),

  barbell_curl: asset('barbell-curl.jfif'),
  biceps_curl: asset('barbell-curl.jfif'),
  db_curl: asset('dumble-curl.jfif'),
  dumbbell_curl: asset('dumble-curl.jfif'),
  hammer_curl: asset('hammer-curl.jfif'),

  tricep_pushdown: asset('tricep-pushdown.jfif'),
  skull_crusher: asset('skull-crusher.jfif'),
  dips: asset('dips.jfif'),

  squat: asset('squat.jfif'),
  barbell_squat: asset('squat.jfif'),
  goblet_squat: asset('squat.jfif'),
  deadlift: asset('glutes.jfif'),
  conventional_deadlift: asset('glutes.jfif'),
  trap_bar_deadlift: asset('glutes.jfif'),
  leg_press: asset('leg-press.jfif'),
  leg_extension: asset('leg-press.jfif'),
  lunges: asset('glutes.jfif'),
  romanian_deadlift: asset('hamstrings.jfif'),
  rdl: asset('hamstrings.jfif'),
  leg_curl: asset('hamstrings.jfif'),
  hip_thrust: asset('glutes.jfif'),
  hip_thrusts: asset('glutes.jfif'),
  calf_raise_standing: asset('glutes.jfif'),

  plank: asset('plank.jfif'),
  cable_crunch: asset('cable crunch.jfif'),
  cable_crunches: asset('cable crunch.jfif'),

  barbell: asset('barbell-row.jfif'),
  dumbbell: asset('dumble-curl.jfif'),
  cable: asset('cable-fly.jfif'),
  machine: asset('leg-press.jfif'),
  bodyweight: asset('plank.jfif'),
  body_weight: asset('plank.jfif'),

  flat_fly: asset('flat-fly.jfif'),
  incline_dumbbell_press: asset('incline-dumbel.jfif'),
  dumbbell_bench_press: asset('bench-prress.jfif'),
  close_grip_bench_press: asset('bench-prress.jfif'),
  pull_down: asset('lat pulldown.jfif'),
  pulldown: asset('lat pulldown.jfif'),
  seated_row: asset('cable-raws.jfif'),
  standing_cable_row: asset('cable-raws.jfif'),
  overhead_press_barbell: asset('overhead-press.jfif'),
  dumbbell_overhead_press: asset('overhead-press.jfif'),
  chest_press: asset('bench-prress.jfif'),
  front_raise: asset('lateral-raise.jfif'),
  rear_delt_row: asset('face-pull.jfif'),
  preacher_curl: asset('barbell-curl.jfif'),
  ez_bar_curl: asset('barbell-curl.jfif'),
  curl: asset('barbell-curl.jfif'),
  leg_extension_machine: asset('leg-press.jfif'),
  hamstring_curl: asset('hamstrings.jfif'),
  seated_leg_curl: asset('hamstrings.jfif'),
  calf_raise: asset('glutes.jfif')
};

export function getExerciseMachineImage(exercise: { id?: string; name?: string; image?: string; equipment?: string[] } | null | undefined): string {
  if (!exercise) return EXERCISE_MACHINE_IMAGE_MAP.machine;
  if (exercise.image) return exercise.image;

  const byId = exercise.id ? EXERCISE_MACHINE_IMAGE_MAP[exercise.id] : undefined;
  if (byId) return byId;

  const name = (exercise.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const byName = EXERCISE_MACHINE_IMAGE_MAP[name];
  if (byName) return byName;

  const equipment = exercise.equipment?.[0] || 'machine';
  return EXERCISE_MACHINE_IMAGE_MAP[equipment] || EXERCISE_MACHINE_IMAGE_MAP.machine;
}
