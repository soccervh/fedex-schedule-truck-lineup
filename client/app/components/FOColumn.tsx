type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';

interface FOSpotAssignment {
  id: string;
  user: {
    id: string;
    name: string;
    homeArea: HomeArea;
    role: 'DRIVER' | 'SWING' | 'MANAGER';
  };
  needsCoverage?: boolean;
  originalUserHomeArea?: HomeArea;
}

interface FOSpot {
  id: number;
  number: number;
  assignment: FOSpotAssignment | null;
}

interface FOColumnProps {
  spots: FOSpot[];
  onSpotClick: (spot: FOSpot) => void;
  isManager: boolean;
}

const areaColors: Record<HomeArea, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
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
    };
    return {
      background: `linear-gradient(135deg, #6B7280 50%, ${colorMap[spot.assignment.originalUserHomeArea]} 50%)`,
    };
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !spot.assignment?.needsCoverage}
      className={`w-full p-2 rounded border transition-all hover:shadow-md text-left ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={getSplitStyle()}
    >
      <div className="flex justify-between items-center text-xs font-medium opacity-90">
        <span>FO{spot.number}</span>
      </div>
      {spot.assignment ? (
        <>
          <div className={`font-semibold truncate text-sm ${spot.assignment.needsCoverage ? 'line-through opacity-60' : ''}`}>
            {spot.assignment.user.name}
          </div>
          {spot.assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700 mt-1">OPEN</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-sm">—</div>
      )}
    </button>
  );
}

export function FOColumn({
  spots,
  onSpotClick,
  isManager,
}: FOColumnProps) {
  // Sort spots by number (1 at top/north, 20 at bottom/south)
  const sortedSpots = [...spots].sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col min-w-[100px] max-w-[120px]">
      <div className="bg-blue-800 text-white text-center py-2 font-semibold rounded-t">
        FO
      </div>
      <div className="flex-1 bg-blue-50 border border-t-0 border-blue-200 rounded-b p-1 space-y-1 overflow-y-auto">
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
  );
}
