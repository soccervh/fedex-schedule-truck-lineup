type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';

interface FacilitySpotAssignment {
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
}

const areaColors: Record<HomeArea, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
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
    };
    return {
      background: `linear-gradient(135deg, #6B7280 50%, ${colorMap[spot.assignment.originalUserHomeArea]} 50%)`,
    };
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !spot.assignment?.needsCoverage}
      className={`w-20 h-20 p-2 rounded border transition-all hover:shadow-md flex flex-col items-center justify-center ${getBackgroundClass()} ${
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
}: UnloadSectionProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="text-center font-semibold text-green-800 mb-3">UNLOAD</div>
      <div className="flex justify-between">
        {/* D/C Side */}
        <div className="flex gap-2">
          <div className="text-xs text-gray-500 self-center mr-2">D/C</div>
          {dcSpots.map((spot) => (
            <UnloadSpotCard
              key={spot.id}
              spot={spot}
              onClick={() => onSpotClick(spot)}
              isManager={isManager}
            />
          ))}
        </div>

        {/* Gap in middle */}
        <div className="w-16" />

        {/* B/A Side */}
        <div className="flex gap-2">
          {baSpots.map((spot) => (
            <UnloadSpotCard
              key={spot.id}
              spot={spot}
              onClick={() => onSpotClick(spot)}
              isManager={isManager}
            />
          ))}
          <div className="text-xs text-gray-500 self-center ml-2">B/A</div>
        </div>
      </div>
    </div>
  );
}
