import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';

interface FOSpotAssignment {
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

interface FOSpot {
  id: number;
  number: number;
  label?: string;
  assignment: FOSpotAssignment | null;
}

interface FOSectionProps {
  spots: FOSpot[];
  onSpotClick: (spot: FOSpot) => void;
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

function FOSpotCard({
  spot,
  onClick,
  isManager,
}: {
  spot: FOSpot;
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
      <div className="text-xs font-medium">FO{spot.number}</div>
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

export function FOSection({
  spots,
  onSpotClick,
  isManager,
  defaultExpanded = true,
}: FOSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sortedSpots = [...spots].sort((a, b) => a.number - b.number);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-blue-800 hover:bg-blue-100 transition-colors text-sm"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        FO ({spots.length})
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-1 justify-center">
            {sortedSpots.map((spot) => (
              <FOSpotCard
                key={spot.id}
                spot={spot}
                onClick={() => onSpotClick(spot)}
                isManager={isManager}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
