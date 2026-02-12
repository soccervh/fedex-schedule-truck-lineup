import { SpotCardCompact } from './SpotCardCompact';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';

interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
}

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
  truckAssignment?: {
    id: string;
    truck: TruckData;
  } | null;
}

interface BeltColumnProps {
  beltId: number;
  beltName: string;
  beltLetter: string;
  baseNumber: number;
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  onSpotDoubleClick: (beltId: number) => void;
  isManager: boolean;
  onTruckDrop?: (spot: Spot, truckNumber: string) => void;
  isDragEnabled?: boolean;
}

export function BeltColumn({
  beltId,
  beltName,
  beltLetter,
  baseNumber,
  spots,
  onSpotClick,
  onSpotDoubleClick,
  isManager,
  onTruckDrop,
  isDragEnabled = false,
}: BeltColumnProps) {
  // Sort spots by number (1 at top/north, 32 at bottom/south)
  const sortedSpots = [...spots].sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col min-w-[140px] max-w-[160px]">
      <div className="bg-gray-800 text-white text-center py-2 font-semibold rounded-t">
        {beltName}
      </div>
      <div className="flex-1 bg-gray-50 border border-t-0 border-gray-200 rounded-b p-1 space-y-1 overflow-y-auto">
        {sortedSpots.map((spot) => (
          <SpotCardCompact
            key={spot.id}
            spotNumber={spot.number}
            beltLetter={beltLetter}
            baseNumber={baseNumber}
            assignment={spot.assignment}
            truckAssignment={spot.truckAssignment}
            onClick={() => onSpotClick(spot)}
            onDoubleClick={() => onSpotDoubleClick(beltId)}
            isManager={isManager}
            isDragEnabled={isDragEnabled}
            onTruckDrop={onTruckDrop ? (truckNumber) => onTruckDrop(spot, truckNumber) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
