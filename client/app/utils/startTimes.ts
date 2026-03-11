// Start time rules by area and day of week
// dayOfWeek: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

export function getStartTime(area: string, dateStr: string): string | null {
  const date = new Date(dateStr + 'T12:00:00');
  const dow = date.getDay();

  // Sunday - no work
  if (dow === 0) return null;

  // Saturday - everyone 7:30 AM except Late Starters 8:00 AM, Truck Movers 6:30 AM
  if (dow === 6) {
    if (area === 'LATE_STARTER') return '8:00 AM';
    if (area === 'TRUCK_MOVER') return '6:30 AM';
    return '7:30 AM';
  }

  // Monday-Friday rules
  switch (area) {
    case 'FO':
      return '6:00 AM';

    case 'LATE_STARTER':
      return '8:00 AM';

    case 'TRUCK_MOVER':
      // 1 hour before sort time
      return dow === 1 ? '5:00 AM' : '5:45 AM';

    case 'PULLER':
    case 'SORT':
    case 'UNLOAD':
      return dow === 1 ? '6:00 AM' : '6:45 AM';

    case 'DOC_SORT':
      // Doc sort = Secondary, Fine Sort, Quarterback
      return dow === 1 ? '6:30 AM' : '7:10 AM';

    case 'DOC_RAMP':
      // Ramp 1 & 2
      return dow === 1 ? '4:00 AM' : '5:00 AM';

    default:
      return null;
  }
}
