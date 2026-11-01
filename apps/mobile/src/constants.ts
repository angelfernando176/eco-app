/** Mirrors apps/web/src/features/users/ageRanges.ts. */
export const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']

/** Mirrors ECO.users.gender in Supabase: 1 Masculino, 2 Femenino, 3 Otro. */
export const GENDERS: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: 'Masculino' },
  { value: 2, label: 'Femenino' },
  { value: 3, label: 'Otro' },
]
