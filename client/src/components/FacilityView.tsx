import { BeltColumn } from './BeltColumn';
import { getBeltDisplayOrder } from '../utils/belt';

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
      homeArea: 'BELT' | 'DOCK' | 'UNLOAD';
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage: boolean;
  } | null;
}

interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: Spot[];
}

interface FacilityViewProps {
  belts: Belt[];
  onSpotClick: (spot: Spot, beltId: number) => void;
  onBeltDoubleClick: (beltId: number) => void;
  isManager: boolean;
}

export function FacilityView({
  belts,
  onSpotClick,
  onBeltDoubleClick,
  isManager,
}: FacilityViewProps) {
  const orderedBelts = getBeltDisplayOrder(belts);

  return (
    <div className="flex flex-col h-full">
      <div className="text-center text-sm text-gray-500 mb-2">NORTH</div>

      <div className="flex-1 flex gap-2 overflow-x-auto overflow-y-auto pb-4">
        {orderedBelts.map((belt) => (
          <BeltColumn
            key={belt.id}
            beltId={belt.id}
            beltName={belt.name}
            beltLetter={belt.letter}
            baseNumber={belt.baseNumber}
            spots={belt.spots}
            onSpotClick={(spot) => onSpotClick(spot, belt.id)}
            onSpotDoubleClick={onBeltDoubleClick}
            isManager={isManager}
          />
        ))}
      </div>

      <div className="text-center text-sm text-gray-500 mt-2">SOUTH</div>
    </div>
  );
}
