export interface BeltInfo {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
}

/**
 * Calculate route number from belt base and spot number
 * Route = baseNumber + (spotNumber * 2)
 */
export function calculateRouteNumber(baseNumber: number, spotNumber: number): number {
  return baseNumber + (spotNumber * 2);
}

/**
 * Format spot display name (e.g., "A1", "B15", "D32")
 */
export function formatSpotName(letter: string, spotNumber: number): string {
  return `${letter}${spotNumber}`;
}

/**
 * Format route display (e.g., "R:102", "R:304")
 */
export function formatRouteDisplay(routeNumber: number): string {
  return `R:${routeNumber}`;
}

/**
 * Get belt display order (D, C, B, A = 400, 300, 200, 100)
 */
export function getBeltDisplayOrder<T extends BeltInfo>(belts: T[]): T[] {
  return [...belts].sort((a, b) => b.baseNumber - a.baseNumber);
}
