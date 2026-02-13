import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';

interface FacilitySpotAssignment {
  id: string;
  user: {
    id: string;
    name: string;
    homeArea: HomeArea;
    role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
  };
  needsCoverage?: boolean;
  originalUserHomeArea?: HomeArea;
}

interface FacilitySpot {
  id: number;
  number: number;
  label?: string;
  side?: string;
  assignment: FacilitySpotAssignment | null;
}

interface UnloadSectionProps {
  dcSpots: FacilitySpot[];
  baSpots: FacilitySpot[];
  onSpotClick: (spot: FacilitySpot) => void;
  isManager: boolean;
  defaultExpanded?: boolean;
}

const areaColors: Record<HomeArea, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
  UNASSIGNED: 'bg-gray-400',
};

function UnloadSpotCard({
  spot,
  onClick,
  isManager,
}: {
  spot: FacilitySpot;
  onClick: () => void;
  isManager: boolean;
}) {
  const isSwingFilling = spot.assignment?.user.role === 'SWING' && spot.assignment?.originalUserHomeArea;

  const getBackgroundClass = () => {
    if (!spot.assignment) return 'bg-gray-50 border-dashed';
    if (spot.assignment.needsCoverage) return 'bg-red-100 border-red-400 border-2';
    if (isSwingFilling) return 'text-white';
    if (spot.assignment.user.role === 'SWING') return 'bg-swing text-white';
    return `${areaColors[spot.assignment.user.homeArea]} text-white`;
  };

  const getSplitStyle = () => {
    if (!isSwingFilling || !spot.assignment?.originalUserHomeArea) return {};
    const colorMap: Record<HomeArea, string> = {
      FO: '#3B82F6',
      DOC: '#F97316',
      UNLOAD: '#22C55E',
      PULLER: '#EAB308',
      UNASSIGNED: '#9CA3AF',
    };
    return {
      background: `linear-gradient(135deg, #6B7280 50%, ${colorMap[spot.assignment.originalUserHomeArea]} 50%)`,
    };
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !spot.assignment?.needsCoverage}
      className={`w-14 h-14 p-1 rounded border transition-all hover:shadow-md flex flex-col items-center justify-center ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={getSplitStyle()}
    >
      <div className="text-xs font-medium">U{spot.number}</div>
      {spot.assignment ? (
        <>
          <div className={`font-semibold truncate text-xs text-center w-full ${spot.assignment.needsCoverage ? 'line-through opacity-60' : ''}`}>
            {spot.assignment.user.name.split(' ')[0]}
          </div>
          {spot.assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700">OPEN</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-xs">—</div>
      )}
    </button>
  );
}

export function UnloadSection({
  dcSpots,
  baSpots,
  onSpotClick,
  isManager,
  defaultExpanded = true,
}: UnloadSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-green-800 hover:bg-green-100 transition-colors text-sm"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        UNLOAD ({dcSpots.length + baSpots.length})
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex justify-between">
            {/* D/C Side */}
            <div>
              <div className="text-xs text-gray-500 text-center mb-1">D/C Side</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {dcSpots.map((spot) => (
                  <UnloadSpotCard key={spot.id} spot={spot} onClick={() => onSpotClick(spot)} isManager={isManager} />
                ))}
              </div>
            </div>
            {/* B/A Side */}
            <div>
              <div className="text-xs text-gray-500 text-center mb-1">B/A Side</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {baSpots.map((spot) => (
                  <UnloadSpotCard key={spot.id} spot={spot} onClick={() => onSpotClick(spot)} isManager={isManager} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
