import { SpotCard } from './SpotCard';

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

interface SpotGridProps {
  spots: Spot[];
  onSpotClick: (spot: Spot) => void;
  isManager: boolean;
}

export function SpotGrid({ spots, onSpotClick, isManager }: SpotGridProps) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {spots.map((spot) => (
        <SpotCard
          key={spot.id}
          spotNumber={spot.number}
          assignment={spot.assignment}
          onClick={() => onSpotClick(spot)}
          isManager={isManager}
        />
      ))}
    </div>
  );
}
