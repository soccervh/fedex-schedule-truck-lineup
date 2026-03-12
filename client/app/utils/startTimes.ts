// Start time computation from editable sort times
// dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

// Fixed offsets from sort time (in minutes) per day type
const OFFSETS: Record<string, Record<string, number>> = {
  TRUCK_MOVER: { mon: -60, tuefri: -60, sat: -60 },
  DOC_SORT:    { mon: 30,  tuefri: 25,  sat: 0 },
  SORT:        { mon: 0,   tuefri: 0,   sat: 0 },
  UNLOAD:      { mon: 0,   tuefri: 0,   sat: 0 },
  PULLER:      { mon: 0,   tuefri: 0,   sat: 0 },
};

// Fixed times that never change (HH:mm). 'SORT' means use sort time.
const FIXED: Record<string, Record<string, string>> = {
  FO:           { mon: '06:00', tuefri: '06:00', sat: 'SORT' },
  LATE_STARTER: { mon: '08:00', tuefri: '08:00', sat: '08:00' },
  DOC_RAMP:     { mon: '04:00', tuefri: '05:00', sat: '05:30' },
};

export interface StartTimeConfig {
  mondaySort: string;   // "HH:mm" format
  tueFriSort: string;
  saturdaySort: string;
}

export const DEFAULT_CONFIG: StartTimeConfig = {
  mondaySort: '06:00',
  tueFriSort: '06:45',
  saturdaySort: '07:30',
};

function getDayType(dateStr: string): 'sun' | 'mon' | 'tuefri' | 'sat' {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();
  if (dow === 0) return 'sun';
  if (dow === 1) return 'mon';
  if (dow === 6) return 'sat';
  return 'tuefri';
}

function getSortTime(config: StartTimeConfig, dayType: string): string {
  if (dayType === 'mon') return config.mondaySort;
  if (dayType === 'sat') return config.saturdaySort;
  return config.tueFriSort;
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const newM = ((total % 1440) + 1440) % 1440 % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function getStartTime(
  area: string,
  dateStr: string,
  config: StartTimeConfig = DEFAULT_CONFIG
): string | null {
  const dayType = getDayType(dateStr);
  if (dayType === 'sun') return null;

  const sortTime = getSortTime(config, dayType);

  // Check fixed times first
  const fixed = FIXED[area];
  if (fixed) {
    const value = fixed[dayType];
    if (value === 'SORT') return formatTime(sortTime);
    return formatTime(value);
  }

  // Check offset-based times
  const offsets = OFFSETS[area];
  if (offsets) {
    const offset = offsets[dayType];
    return formatTime(addMinutes(sortTime, offset));
  }

  return null;
}

// Map a route's loadLocation to the start time area key
export function loadLocationToArea(loadLocation: string | null, isTruckMover?: boolean): string | null {
  if (isTruckMover) return 'TRUCK_MOVER';
  if (!loadLocation) return null;
  switch (loadLocation) {
    case 'FO': return 'FO';
    case 'DOC': return 'DOC_SORT';
    case 'UNLOAD': return 'UNLOAD';
    case 'SORT':
    case 'LABEL_FACER':
    case 'SCANNER':
    case 'SPLITTER': return 'SORT';
    case 'PULLER': return 'PULLER';
    case 'LATE_STARTER': return 'LATE_STARTER';
    default: return null;
  }
}

// Get all area times for preview in settings modal
export function getAllStartTimes(
  dateStr: string,
  config: StartTimeConfig = DEFAULT_CONFIG
): Record<string, string | null> {
  const areas = ['SORT', 'UNLOAD', 'PULLER', 'TRUCK_MOVER', 'DOC_SORT', 'DOC_RAMP', 'FO', 'LATE_STARTER'];
  const result: Record<string, string | null> = {};
  for (const area of areas) {
    result[area] = getStartTime(area, dateStr, config);
  }
  return result;
}
