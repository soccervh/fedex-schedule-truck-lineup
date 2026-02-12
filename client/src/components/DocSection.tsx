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
  assignment: FacilitySpotAssignment | null;
}

interface DocSectionProps {
  secondarySpots: FacilitySpot[];      // 8 spots, numbered 8-1
  quarterbackUpperSpots: FacilitySpot[]; // 2 spots: QB1, QB2
  fineSortSpots: FacilitySpot[];        // 8 spots, numbered 1-8
  quarterbackLowerSpots: FacilitySpot[]; // 1 spot: QB1
  rampSpots: FacilitySpot[];            // 2 spots: Ramp1, Ramp2
  onSpotClick: (spot: FacilitySpot) => void;
  isManager: boolean;
}

const areaColors: Record<HomeArea, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
};

function DocSpotCard({
  spot,
  onClick,
  isManager,
  size = 'normal',
}: {
  spot: FacilitySpot;
  onClick: () => void;
  isManager: boolean;
  size?: 'normal' | 'small';
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

  const sizeClasses = size === 'small' ? 'w-14 h-14 text-xs' : 'w-16 h-16';

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !spot.assignment?.needsCoverage}
      className={`${sizeClasses} p-1 rounded border transition-all hover:shadow-md flex flex-col items-center justify-center ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
      style={getSplitStyle()}
    >
      <div className="text-xs font-medium">{spot.label || spot.number}</div>
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

export function DocSection({
  secondarySpots,
  quarterbackUpperSpots,
  fineSortSpots,
  quarterbackLowerSpots,
  rampSpots,
  onSpotClick,
  isManager,
}: DocSectionProps) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <div className="text-center font-semibold text-orange-800 mb-3">DOC</div>

      <div className="space-y-2">
        {/* Secondary Row (8 spots, numbered 8 down to 1) */}
        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-500 w-20">Secondary</div>
          <div className="flex gap-1 justify-center flex-1">
            {secondarySpots.map((spot) => (
              <DocSpotCard
                key={spot.id}
                spot={spot}
                onClick={() => onSpotClick(spot)}
                isManager={isManager}
                size="small"
              />
            ))}
          </div>
        </div>

        {/* Quarterback Upper Row (2 spots) */}
        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-500 w-20">QB</div>
          <div className="flex gap-1 justify-center flex-1">
            {quarterbackUpperSpots.map((spot) => (
              <DocSpotCard
                key={spot.id}
                spot={spot}
                onClick={() => onSpotClick(spot)}
                isManager={isManager}
                size="small"
              />
            ))}
          </div>
        </div>

        {/* Fine Sort Row (8 spots, numbered 1-8) */}
        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-500 w-20">Fine Sort</div>
          <div className="flex gap-1 justify-center flex-1">
            {fineSortSpots.map((spot) => (
              <DocSpotCard
                key={spot.id}
                spot={spot}
                onClick={() => onSpotClick(spot)}
                isManager={isManager}
                size="small"
              />
            ))}
          </div>
        </div>

        {/* Bottom Row: QB1 + Ramp1 + Ramp2 */}
        <div className="flex items-center gap-1">
          <div className="text-xs text-gray-500 w-20">QB + Ramps</div>
          <div className="flex gap-1 justify-center flex-1">
            {quarterbackLowerSpots.map((spot) => (
              <DocSpotCard
                key={spot.id}
                spot={spot}
                onClick={() => onSpotClick(spot)}
                isManager={isManager}
                size="small"
              />
            ))}
            {rampSpots.map((spot) => (
              <DocSpotCard
                key={spot.id}
                spot={spot}
                onClick={() => onSpotClick(spot)}
                isManager={isManager}
                size="small"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
