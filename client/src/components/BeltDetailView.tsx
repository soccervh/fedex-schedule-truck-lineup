import { SpotCardDetailed } from './SpotCardDetailed';

type HomeArea = 'FO' | 'DOCK' | 'UNLOAD' | 'PULLER';

interface Spot {
  id: number;
  number: number;
  assignment: {
    id: string;
    truckNumber: string;
    isOverride: boolean;
    user: {
      id: string;
      name: string;
      homeArea: HomeArea;
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage: boolean;
    originalUserHomeArea?: HomeArea;
  } | null;
}

interface BeltDetailViewProps {
  beltName: string;
  beltLetter: string;
  baseNumber: number;
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  onBack: () => void;
  isManager: boolean;
}

export function BeltDetailView({
  beltName,
  beltLetter,
  baseNumber,
  spots,
  onSpotClick,
  onBack,
  isManager,
}: BeltDetailViewProps) {
  const sortedSpots = [...spots].sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <span className="text-xl">←</span>
          <span>Back to Facility</span>
        </button>
        <h2 className="text-xl font-semibold">{beltName}</h2>
      </div>

      <div className="text-center text-sm text-gray-500 mb-2">NORTH</div>

      <div className="flex-1 overflow-y-auto space-y-2 px-2">
        {sortedSpots.map((spot) => (
          <SpotCardDetailed
            key={spot.id}
            spotNumber={spot.number}
            beltLetter={beltLetter}
            baseNumber={baseNumber}
            assignment={spot.assignment}
            onClick={() => onSpotClick(spot)}
            isManager={isManager}
          />
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 mt-2">SOUTH</div>
    </div>
  );
}
