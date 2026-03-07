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

interface SortSectionProps {
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

function SortSpotCard({
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
    return 'bg-purple-500 text-white border-2 border-purple-700';
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
      <div className="text-xs font-medium">{spot.label || spot.number}</div>
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
        <div className="text-gray-400 dark:text-gray-500 text-xs">—</div>
      )}
      {mappedRoutes.map(route => (
        <div key={route.id} className="text-[10px] truncate w-full text-center leading-tight">
          {route.driver && !route.driverIsOff && <div>{formatName(route.driver.name)}</div>}
          <div>R:{route.number}</div>
        </div>
      ))}
    </button>
  );
}

function SortSideColumn({
  label,
  spots,
  routesBySpotId,
  onSpotClick,
  isManager,
}: {
  label: string;
  spots: FacilitySpot[];
  routesBySpotId: Map<number, RouteAssignment[]>;
  onSpotClick: (spot: FacilitySpot) => void;
  isManager: boolean;
}) {
  const labelFacers = spots.filter(s => s.label?.startsWith('LF'));
  const scanners = spots.filter(s => s.label?.startsWith('SC'));
  const splitters = spots.filter(s => s.label?.startsWith('SP'));

  return (
    <div>
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">{label}</div>
      <div className="space-y-1">
        {/* Label Facers row */}
        <div className="flex gap-1 justify-center">
          {labelFacers.map((spot) => (
            <SortSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
          ))}
        </div>
        {/* Scanners row */}
        <div className="flex gap-1 justify-center">
          {scanners.map((spot) => (
            <SortSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
          ))}
        </div>
        {/* Splitters row */}
        <div className="flex gap-1 justify-center">
          {splitters.map((spot) => (
            <SortSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SortSection({
  dcSpots,
  baSpots,
  routes = [],
  onSpotClick,
  isManager,
  defaultExpanded = true,
}: SortSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const allSortSpots = [...dcSpots, ...baSpots];
  const filledSpots = allSortSpots.filter(s => s.assignment && !s.assignment.needsCoverage).length;
  const routesWithDriver = routes.filter(r => r.driver && !r.driverIsOff).length;
  const totalX = filledSpots + routesWithDriver;
  const totalY = allSortSpots.length;

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
    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-purple-800 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors text-sm"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        SORT ({totalX}/{totalY})
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex justify-between">
            <SortSideColumn
              label="D/C Side"
              spots={dcSpots}
              routesBySpotId={routesBySpotId}
              onSpotClick={onSpotClick}
              isManager={isManager}
            />
            <SortSideColumn
              label="B/A Side"
              spots={baSpots}
              routesBySpotId={routesBySpotId}
              onSpotClick={onSpotClick}
              isManager={isManager}
            />
          </div>

          {/* Unassigned route list */}
          {routes.filter(r => !r.facilitySpotId).length > 0 && (
            <div className="border-t border-purple-200 dark:border-purple-700 pt-2">
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1 text-center">Routes</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {routes.filter(r => !r.facilitySpotId).map(route => (
                  <div
                    key={route.id}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      route.driver && !route.driverIsOff
                        ? route.driver.role === 'SWING' ? 'bg-swing text-white' : 'bg-purple-500 text-white'
                        : 'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 border border-purple-300 dark:border-purple-600'
                    }`}
                  >
                    R:{route.number}{route.driver && !route.driverIsOff ? ` ${formatName(route.driver.name)}` : ''}
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
