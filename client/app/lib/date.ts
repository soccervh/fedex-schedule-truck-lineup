/** Returns today's date as YYYY-MM-DD in America/New_York timezone */
export function todayET(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Formats a Date as YYYY-MM-DD in America/New_York timezone */
export function formatDateET(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}
