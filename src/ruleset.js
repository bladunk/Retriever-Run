export const legacyMigrationRuleset = 'migration-30-phase-03'
export const courseRuleset = 'migration-30-phase-05'
export const localCourseRuleset = 'migration-30-raptor'
export const migrationCourse = value => [localCourseRuleset, courseRuleset, legacyMigrationRuleset].includes(value)
// Last deployed Camp season predates lane-bound slides and alternate scoring.
// Switch only when the backend isolates and authorizes the new gameplay rules.
export const campRuleset = 'phase-01'
