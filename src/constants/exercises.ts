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

// ── Roster Column Options ────────────────────────────────────────────────
// Comprehensive lift + measurement catalog for customizable roster columns.
// Organized to match/exceed TeamBuildr's tracking categories.

export type RosterColumnDef = {
  key: string
  label: string
  shortLabel: string
  type: 'max' | 'test'
  /** For 'max' columns, the exercise name stored in player_maxes.exercise */
  exercise?: string
  /** For 'test' columns, the metric_name stored in player_testing.metric_name */
  metric?: string
  unit: string
  category: string
}

// ── Lift columns (tracked as maxes in lbs) ───────────────────────────────

const MAX_COL = (key: string, label: string, shortLabel: string, category: string): RosterColumnDef => ({
  key, label, shortLabel, type: 'max', exercise: label, unit: 'lbs', category,
})

// ── Test columns (tracked as testing metrics) ────────────────────────────

const TEST_COL = (key: string, label: string, shortLabel: string, metric: string, unit: string, category: string): RosterColumnDef => ({
  key, label, shortLabel, type: 'test', metric, unit, category,
})

export const ROSTER_COLUMN_OPTIONS: RosterColumnDef[] = [
  // ── Squat Variations ──
  MAX_COL('back-squat',       'Back Squat',             'Squat',    'Squat'),
  MAX_COL('front-squat',      'Front Squat',            'F.Squat',  'Squat'),
  MAX_COL('goblet-squat',     'Goblet Squat',           'Goblet',   'Squat'),
  MAX_COL('overhead-squat',   'Overhead Squat',         'OH Squat', 'Squat'),
  MAX_COL('split-squat',      'Split Squat',            'Split Sq', 'Squat'),
  MAX_COL('bulgarian-ss',     'Bulgarian Split Squat',  'BSS',      'Squat'),
  MAX_COL('leg-press',        'Leg Press',              'Leg Pr',   'Squat'),

  // ── Bench / Press ──
  MAX_COL('bench-press',      'Bench Press',            'Bench',    'Press'),
  MAX_COL('incline-bench',    'Incline Bench Press',    'Inc Ben',  'Press'),
  MAX_COL('close-grip-bench', 'Close Grip Bench',       'CG Ben',   'Press'),
  MAX_COL('db-bench',         'DB Bench Press',         'DB Ben',   'Press'),
  MAX_COL('incline-db',       'Incline DB Press',       'Inc DB',   'Press'),
  MAX_COL('floor-press',      'Floor Press',            'Floor',    'Press'),
  MAX_COL('overhead-press',   'Overhead Press',         'OHP',      'Press'),
  MAX_COL('push-press',       'Push Press',             'Push Pr',  'Press'),
  MAX_COL('db-overhead',      'DB Overhead Press',      'DB OHP',   'Press'),

  // ── Pull / Hinge ──
  MAX_COL('deadlift',         'Deadlift',               'Dead',     'Pull'),
  MAX_COL('trap-bar-dl',      'Trap Bar Deadlift',      'Trap DL',  'Pull'),
  MAX_COL('sumo-deadlift',    'Sumo Deadlift',          'Sumo DL',  'Pull'),
  MAX_COL('romanian-dl',      'Romanian Deadlift',      'RDL',      'Pull'),
  MAX_COL('rack-pull',        'Rack Pull',              'Rack Pl',  'Pull'),
  MAX_COL('barbell-row',      'Barbell Row',            'BB Row',   'Pull'),
  MAX_COL('pendlay-row',      'Pendlay Row',            'Pendlay',  'Pull'),
  MAX_COL('db-row',           'DB Row',                 'DB Row',   'Pull'),
  MAX_COL('lat-pulldown',     'Lat Pulldown',           'Lat PD',   'Pull'),
  MAX_COL('good-morning',     'Good Morning',           'GM',       'Pull'),

  // ── Olympic Lifts ──
  MAX_COL('power-clean',      'Power Clean',            'P.Clean',  'Olympic'),
  MAX_COL('hang-clean',       'Hang Clean',             'H.Clean',  'Olympic'),
  MAX_COL('squat-clean',      'Squat Clean',            'Sq.Clean', 'Olympic'),
  MAX_COL('power-snatch',     'Power Snatch',           'P.Snatch', 'Olympic'),
  MAX_COL('hang-snatch',      'Hang Snatch',            'H.Snatch', 'Olympic'),
  MAX_COL('clean-jerk',       'Clean & Jerk',           'C&J',      'Olympic'),
  MAX_COL('push-jerk',        'Push Jerk',              'P.Jerk',   'Olympic'),

  // ── Accessory / Other Lifts ──
  MAX_COL('hip-thrust',       'Hip Thrust',             'Hip Th',   'Accessory'),
  MAX_COL('glute-ham',        'Glute Ham Raise',        'GHR',      'Accessory'),
  MAX_COL('leg-curl',         'Leg Curl',               'Leg Cu',   'Accessory'),
  MAX_COL('leg-extension',    'Leg Extension',          'Leg Ex',   'Accessory'),
  MAX_COL('pullups',          'Pull-ups',               'Pullup',   'Accessory'),
  MAX_COL('chinups',          'Chin-ups',               'Chinup',   'Accessory'),
  MAX_COL('dips',             'Dips',                   'Dips',     'Accessory'),
  MAX_COL('farmers-walk',     'Farmers Walk',           'Farmer',   'Accessory'),

  // ── Speed / Sprint ──
  TEST_COL('10yd',            '10 Yard Dash',           '10yd',     '10 Yard Dash',       's',     'Speed'),
  TEST_COL('20yd',            '20 Yard Dash',           '20yd',     '20 Yard Dash',       's',     'Speed'),
  TEST_COL('40yd',            '40 Yard Dash',           '40yd',     '40 Yard Dash',       's',     'Speed'),
  TEST_COL('flying-10',       'Flying 10',              'Fly10',    'Flying 10',          's',     'Speed'),

  // ── Agility ──
  TEST_COL('pro-agility',     'Pro Agility (5-10-5)',   'ProAg',    'Pro Agility',        's',     'Agility'),
  TEST_COL('3-cone',          '3-Cone Drill',           '3Cone',    '3-Cone Drill',       's',     'Agility'),
  TEST_COL('l-drill',         'L-Drill',                'L-Drill',  'L-Drill',            's',     'Agility'),

  // ── Vertical Power / Jumping ──
  TEST_COL('vert-jump',       'Vertical Jump',          'Vert',     'Vertical Jump',      'in',    'Jump'),
  TEST_COL('broad-jump',      'Broad Jump',             'Broad',    'Broad Jump',         'in',    'Jump'),
  TEST_COL('cmj',             'Countermovement Jump',   'CMJ',      'Countermovement Jump', 'in',  'Jump'),
  TEST_COL('squat-jump',      'Squat Jump',             'SqJump',   'Squat Jump',         'in',    'Jump'),

  // ── Endurance / Conditioning ──
  TEST_COL('300yd-shuttle',   '300 Yard Shuttle',       '300yd',    '300 Yard Shuttle',   's',     'Endurance'),
  TEST_COL('mile-run',        'Mile Run',               'Mile',     'Mile Run',           'min',   'Endurance'),
  TEST_COL('bench-225',       'Bench Reps (225)',       '225 Rep',  'Bench Reps (225)',   'reps',  'Endurance'),
  TEST_COL('bench-185',       'Bench Reps (185)',       '185 Rep',  'Bench Reps (185)',   'reps',  'Endurance'),
  TEST_COL('yoyo',            'Yo-Yo Test',             'Yo-Yo',    'Yo-Yo Test',         'lvl',   'Endurance'),

  // ── Body Composition / Anthropometrics ──
  TEST_COL('height',          'Height',                 'Ht',       'Height',             'in',    'Body'),
  TEST_COL('weight',          'Weight',                 'Wt',       'Weight',             'lbs',   'Body'),
  TEST_COL('body-fat',        'Body Fat %',             'BF%',      'Body Fat %',         '%',     'Body'),
  TEST_COL('wingspan',        'Wingspan',               'Wing',     'Wingspan',           'in',    'Body'),
  TEST_COL('hand-size',       'Hand Size',              'Hand',     'Hand Size',          'in',    'Body'),
  TEST_COL('arm-length',      'Arm Length',             'Arm L',    'Arm Length',         'in',    'Body'),
  TEST_COL('arm-circ',        'Arm Circumference',      'Arm C',    'Arm Circumference',  'in',    'Body'),
  TEST_COL('chest-circ',      'Chest Circumference',    'Chest',    'Chest Circumference', 'in',   'Body'),
  TEST_COL('thigh-circ',      'Thigh Circumference',    'Thigh',    'Thigh Circumference', 'in',   'Body'),
  TEST_COL('waist-circ',      'Waist Circumference',    'Waist',    'Waist Circumference', 'in',   'Body'),
  TEST_COL('neck-circ',       'Neck Circumference',     'Neck',     'Neck Circumference',  'in',   'Body'),
]

/** Default columns shown before the coach customizes. */
export const DEFAULT_ROSTER_COLUMNS = [
  'bench-press',
  'back-squat',
  'power-clean',
  '40yd',
  'vert-jump',
]

/** All unique categories for grouping in the column picker. */
export const ROSTER_COLUMN_CATEGORIES = [
  'Squat', 'Press', 'Pull', 'Olympic', 'Accessory',
  'Speed', 'Agility', 'Jump', 'Endurance', 'Body',
] as const
