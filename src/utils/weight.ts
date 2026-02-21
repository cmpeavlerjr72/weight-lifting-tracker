/** Rounds a weight to the nearest 5 lbs. */
export function roundToNearest5(weight: number): number {
  return Math.round(weight / 5) * 5
}

/**
 * Resolves a set group to an actual weight given a player's max.
 * Returns fixedWeight directly, or computes percentOfMax and rounds.
 * Returns null if percentOfMax is specified but no max is available.
 */
export function resolveWeight(
  setGroup: { percentOfMax?: number; fixedWeight?: number },
  playerMax: number | null | undefined,
): number | null {
  if (setGroup.fixedWeight != null) return setGroup.fixedWeight
  if (setGroup.percentOfMax != null && playerMax != null && playerMax > 0) {
    return roundToNearest5((setGroup.percentOfMax / 100) * playerMax)
  }
  return null
}
