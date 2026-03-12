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
  assignment: FacilitySpotAssignment | null;
}

interface RouteAssignment {
  id: number;
  number: string;
  facilitySpotId: number | null;
  driver: { id: string; name: string; role?: string } | null;
  driverIsOff: boolean;
}

interface DocSectionProps {
  secondarySpots: FacilitySpot[];
  quarterbackUpperSpots: FacilitySpot[];
  fineSortSpots: FacilitySpot[];
  quarterbackLowerSpots: FacilitySpot[];
  rampSpots: FacilitySpot[];
  routes?: RouteAssignment[];
  onSpotClick: (spot: FacilitySpot) => void;
  isManager: boolean;
  defaultExpanded?: boolean;
  sortStartTime?: string | null;
  rampStartTime?: string | null;
}

function formatName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

function DocSpotCard({
  spot,
  mappedRoutes,
  onClick,
  isManager,
  isRamp,
}: {
  spot: FacilitySpot;
  mappedRoutes: RouteAssignment[];
  onClick: () => void;
  isManager: boolean;
  isRamp?: boolean;
}) {
  const hasRouteDriver = mappedRoutes.some(r => r.driver && !r.driverIsOff);
  const isSwing = spot.assignment?.user.role === 'SWING' || mappedRoutes.some(r => r.driver && !r.driverIsOff && r.driver.role === 'SWING');
  const getBackgroundClass = () => {
    if (!spot.assignment && !hasRouteDriver) return 'bg-gray-50 dark:bg-gray-700 dark:text-gray-200 border-2 border-dashed border-gray-300 dark:border-gray-500';
    if (isSwing) return 'bg-swing text-white border-2 border-gray-500';
    return 'bg-doc text-white border-2 border-orange-700';
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
      <div className="text-xs font-medium">
        {isRamp && mappedRoutes.length > 0
          ? `R:${mappedRoutes[0].number}`
          : (spot.label || spot.number)}
      </div>
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
          {!isRamp && <div>R:{route.number}</div>}
        </div>
      ))}
    </button>
  );
}

export function DocSection({
  secondarySpots,
  quarterbackUpperSpots,
  fineSortSpots,
  quarterbackLowerSpots,
  rampSpots,
  routes = [],
  onSpotClick,
  isManager,
  defaultExpanded = true,
  sortStartTime,
  rampStartTime,
}: DocSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const allDocSpots = [...secondarySpots, ...quarterbackUpperSpots, ...fineSortSpots, ...quarterbackLowerSpots, ...rampSpots];
  const filledSpots = allDocSpots.filter(s => s.assignment && !s.assignment.needsCoverage).length;
  const routesWithDriver = routes.filter(r => r.driver && !r.driverIsOff).length;
  const totalX = filledSpots + routesWithDriver;
  const totalY = allDocSpots.length;

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
    <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors text-sm"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        DOC ({totalX}/{totalY}){sortStartTime && <span className="font-normal text-xs ml-2 opacity-75">Sort: {sortStartTime}</span>}{rampStartTime && <span className="font-normal text-xs ml-2 opacity-75">Ramp: {rampStartTime}</span>}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Row 1: Secondary S1-S8 */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">Secondary</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {[...secondarySpots].reverse().map((spot) => (
                <DocSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
              ))}
            </div>
          </div>

          {/* Row 2: QB1, QB2 */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">Quarterback</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {quarterbackUpperSpots.map((spot) => (
                <DocSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
              ))}
            </div>
          </div>

          {/* Row 3: FS1-FS8 */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">Fine Sort</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {[...fineSortSpots].reverse().map((spot) => (
                <DocSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
              ))}
            </div>
          </div>

          {/* Row 4: QB3, Ramp1, Ramp2 */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center mb-1">QB + Ramps</div>
            <div className="flex flex-wrap gap-1 justify-center">
              {quarterbackLowerSpots.map((spot) => (
                <DocSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} />
              ))}
              {rampSpots.map((spot) => (
                <DocSpotCard key={spot.id} spot={spot} mappedRoutes={routesBySpotId.get(spot.id) || []} onClick={() => onSpotClick(spot)} isManager={isManager} isRamp />
              ))}
            </div>
          </div>

          {/* Unassigned route list */}
          {routes.filter(r => !r.facilitySpotId).length > 0 && (
            <div className="border-t border-orange-200 dark:border-orange-700 pt-2">
              <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1 text-center">Routes</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {routes.filter(r => !r.facilitySpotId).map(route => (
                  <div
                    key={route.id}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      route.driver && !route.driverIsOff
                        ? route.driver.role === 'SWING' ? 'bg-swing text-white' : 'bg-orange-500 text-white'
                        : 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 border border-orange-300 dark:border-orange-600'
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
