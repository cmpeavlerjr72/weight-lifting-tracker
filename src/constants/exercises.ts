/** Core exercise catalog — all 10 exercises the firmware supports. */
export const EXERCISE_CATALOG = [
  'Back Squat',
  'Front Squat',
  'Bench Press',
  'Overhead Press',
  'Deadlift',
  'Trap Bar Deadlift',
  'Romanian Deadlift',
  'Power Clean',
  'Hang Clean',
  'Push Press',
] as const

export type CatalogExercise = (typeof EXERCISE_CATALOG)[number]

/** Standard football athletic testing presets. */
export const TESTING_PRESETS = [
  { name: '40 Yard Dash', unit: 's' },
  { name: 'Vertical Jump', unit: 'in' },
  { name: 'Broad Jump', unit: 'in' },
  { name: 'Pro Agility', unit: 's' },
  { name: '3-Cone Drill', unit: 's' },
  { name: 'Height', unit: 'in' },
  { name: 'Weight', unit: 'lbs' },
  { name: 'Wingspan', unit: 'in' },
  { name: 'Bench Reps (225)', unit: 'reps' },
] as const
