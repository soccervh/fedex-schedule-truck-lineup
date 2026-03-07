interface SwingDriver {
  id: string;
  name: string;
}

interface RouteAssignment {
  id: number;
  number: string;
  facilitySpotId: number | null;
  driver: { id: string; name: string; role?: string } | null;
  driverIsOff: boolean;
}

interface RouteAssignments {
  FO: RouteAssignment[];
  DOC: RouteAssignment[];
  UNLOAD: RouteAssignment[];
  SORT: RouteAssignment[];
}

interface SwingDriversSidebarProps {
  swingDrivers: SwingDriver[];
  routeAssignments?: RouteAssignments;
  onDriverClick?: (driver: SwingDriver) => void;
}

export function SwingDriversSidebar({ swingDrivers, routeAssignments, onDriverClick }: SwingDriversSidebarProps) {
  // Build a map of swing driver id -> assigned position + route
  const driverInfo = new Map<string, { section: string; routeNumber: string }>();
  if (routeAssignments) {
    for (const [section, routes] of Object.entries(routeAssignments)) {
      for (const route of routes) {
        if (route.driver && !route.driverIsOff && route.driver.role === 'SWING') {
          driverInfo.set(route.driver.id, { section, routeNumber: route.number });
        }
      }
    }
  }

  // Sort: unassigned first, assigned to bottom
  const sorted = [...swingDrivers].sort((a, b) => {
    const aAssigned = driverInfo.has(a.id) ? 1 : 0;
    const bAssigned = driverInfo.has(b.id) ? 1 : 0;
    if (aAssigned !== bAssigned) return aAssigned - bAssigned;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="w-48 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-swing">
        <h3 className="font-semibold text-white">SWING DRIVERS</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">No swing drivers</div>
        ) : (
          sorted.map((driver) => {
            const info = driverInfo.get(driver.id);
            return (
              <button
                key={driver.id}
                onClick={() => onDriverClick?.(driver)}
                className={`w-full p-3 text-left border-b border-gray-100 hover:bg-purple-50 transition-colors ${info ? 'opacity-60' : ''}`}
              >
                <div className="font-medium text-gray-900">{driver.name}</div>
                {info && (
                  <div className="text-xs text-gray-500 mt-0.5">{info.section} - R:{info.routeNumber}</div>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">
          {swingDrivers.length} driver{swingDrivers.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
