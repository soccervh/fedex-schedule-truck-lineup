import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface FacilitySpotAssignment {
  id: string;
  user: {
    id: string;
    name: string;
    role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
  };
  needsCoverage?: boolean;
}

interface FacilitySpot {
  id: number;
  number: number;
  label?: string;
  side?: string;
  assignment: FacilitySpotAssignment | null;
}

interface RouteAssignment {
  id: number;
  number: string;
  facilitySpotId: number | null;
  driver: { id: string; name: string; role?: string } | null;
  driverIsOff: boolean;
}

interface UnloadSectionProps {
  dcSpots: FacilitySpot[];
  baSpots: FacilitySpot[];
  routes?: RouteAssignment[];
  onSpotClick: (spot: FacilitySpot) => void;
  isManager: boolean;
  defaultExpanded?: boolean;
}

function formatName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

function UnloadSpotCard({
  spot,
  mappedRoutes,
  onClick,
  isManager,
}: {
  spot: FacilitySpot;
  mappedRoutes: RouteAssignment[];
  onClick: () => void;
  isManager: boolean;
}) {
  const hasRouteDriver = mappedRoutes.some(r => r.driver && !r.driverIsOff);
  const isSwing = spot.assignment?.user.role === 'SWING' || mappedRoutes.some(r => r.driver && !r.driverIsOff && r.driver.role === 'SWING');
  const getBackgroundClass = () => {
    if (!spot.assignment && !hasRouteDriver) return 'bg-gray-50 border-2 border-dashed border-gray-300';
    if (isSwing) return 'bg-swing text-white border-2 border-gray-500';
    return 'bg-unload text-white border-2 border-green-700';
  };

  const needsFillOutline = spot.assignment?.needsCoverage ? 'outline outline-3 outline-red-500 outline-offset-1' : '';

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !spot.assignment?.needsCoverage}
      className={`w-16 min-h-14 p-1 rounded transition-all hover:shadow-md flex flex-col items-center justify-center ${getBackgroundClass()} ${needsFillOutline} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="text-xs font-medium">U{spot.number}</div>
      {spot.assignment ? (
        <>
          <div className={`font-semibold truncate text-xs text-center w-full ${spot.assignment.needsCoverage ? 'line-through opacity-60' : ''}`}>
            {formatName(spot.assignment.user.name)}
          </div>
          {spot.assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700">OPEN</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-xs">—</div>
      )}
      {mappedRoutes.map(route => (
        <div key={route.id} className="text-[10px] truncate w-full text-center leading-tight">
          {route.driver && !route.driverIsOff ? formatName(route.driver.name) : `R:${route.number}`}
        </div>
      ))}
    </button>
  );
}

export function UnloadSection({
  dcSpots,
  baSpots,
  routes = [],
  onSpotClick,
  isManager,
  defaultExpanded = true,
}: UnloadSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const allUnloadSpots = [...dcSpots, ...baSpots];
  const filledSpots = allUnloadSpots.filter(s => s.assignment && !s.assignment.needsCoverage).length;
  const routesWithDriver = routes.filter(r => r.driver && !r.driverIsOff).length;
  const totalX = filledSpots + routesWithDriver;
  const totalY = allUnloadSpots.length;

  // Build mapping of spotId -> routes
  const routesBySpotId = new Map<number, RouteAssignment[]>();
  for (const route of routes) {
    if (route.facilitySpotId) {
      const existing = routesBySpotId.get(route.facilitySpotId) || [];
      existing.push(route);
      routesBySpotId.set(route.facilitySpotId, existing);
    }
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-green-800 hover:bg-green-100 transition-colors text-sm"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        UNLOAD ({totalX}/{totalY})
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex justify-between">
            {/* D/C Side */}
            <div>
              <div className="text-xs text-gray-500 text-center mb-1">D/C Side</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {dcSpots.map((spot) => (
                  <UnloadSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
                ))}
              </div>
            </div>
            {/* B/A Side */}
            <div>
              <div className="text-xs text-gray-500 text-center mb-1">B/A Side</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {baSpots.map((spot) => (
                  <UnloadSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
                ))}
              </div>
            </div>
          </div>

          {/* Unassigned route list */}
          {routes.filter(r => !r.facilitySpotId).length > 0 && (
            <div className="border-t border-green-200 pt-2">
              <div className="text-xs text-green-600 font-medium mb-1 text-center">Routes</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {routes.filter(r => !r.facilitySpotId).map(route => (
                  <div
                    key={route.id}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      route.driver && !route.driverIsOff
                        ? route.driver.role === 'SWING' ? 'bg-swing text-white' : 'bg-green-500 text-white'
                        : 'bg-green-100 text-green-700 border border-green-300'
                    }`}
                  >
                    {route.driver && !route.driverIsOff
                      ? formatName(route.driver.name)
                      : `R:${route.number}`}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
