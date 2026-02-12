import { BeltColumn } from './BeltColumn';
import { UnloadSection } from './UnloadSection';
import { DocSection } from './DocSection';
import { FOColumn } from './FOColumn';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';

interface BeltSpot {
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

interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: BeltSpot[];
}

interface FacilitySpot {
  id: number;
  number: number;
  label?: string;
  side?: string;
  assignment: {
    id: string;
    user: {
      id: string;
      name: string;
      homeArea: HomeArea;
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage?: boolean;
    originalUserHomeArea?: HomeArea;
  } | null;
}

interface FacilityArea {
  name: string;
  subArea: string | null;
  spots: FacilitySpot[];
}

interface FacilityViewProps {
  belts: Belt[];
  facilityAreas: Record<string, FacilityArea>;
  onBeltSpotClick: (spot: BeltSpot, beltId: number) => void;
  onFacilitySpotClick: (spot: FacilitySpot) => void;
  onBeltDoubleClick: (beltId: number) => void;
  isManager: boolean;
}

export function FacilityView({
  belts,
  facilityAreas,
  onBeltSpotClick,
  onFacilitySpotClick,
  onBeltDoubleClick,
  isManager,
}: FacilityViewProps) {
  // Organize belts: D, C on left; B, A on right
  const leftBelts = belts.filter(b => b.letter === 'D' || b.letter === 'C')
    .sort((a, b) => b.baseNumber - a.baseNumber); // D first, then C
  const rightBelts = belts.filter(b => b.letter === 'B' || b.letter === 'A')
    .sort((a, b) => b.baseNumber - a.baseNumber); // B first, then A

  // Get facility areas
  const unloadDC = facilityAreas['UNLOAD-D/C Side']?.spots || [];
  const unloadBA = facilityAreas['UNLOAD-B/A Side']?.spots || [];
  const secondary = facilityAreas['DOC-Secondary']?.spots || [];
  const qbUpper = facilityAreas['DOC-Quarterback Upper']?.spots || [];
  const fineSort = facilityAreas['DOC-Fine Sort']?.spots || [];
  const qbLower = facilityAreas['DOC-Quarterback Lower']?.spots.filter(s => s.label === 'QB1') || [];
  const ramps = facilityAreas['DOC-Quarterback Lower']?.spots.filter(s => s.label?.startsWith('Ramp')) || [];
  const foSpots = facilityAreas['FO-default']?.spots || [];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4">
      {/* UNLOAD Section */}
      <UnloadSection
        dcSpots={unloadDC}
        baSpots={unloadBA}
        onSpotClick={onFacilitySpotClick}
        isManager={isManager}
      />

      {/* DOC Section */}
      <DocSection
        secondarySpots={secondary}
        quarterbackUpperSpots={qbUpper}
        fineSortSpots={fineSort}
        quarterbackLowerSpots={qbLower}
        rampSpots={ramps}
        onSpotClick={onFacilitySpotClick}
        isManager={isManager}
      />

      {/* BELTS Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex-1">
        <div className="text-center font-semibold text-gray-800 mb-3">BELTS</div>
        <div className="text-center text-sm text-gray-500 mb-2">WEST</div>

        <div className="flex gap-4 justify-center overflow-x-auto pb-4">
          {/* Left side: D Belt, C Belt */}
          <div className="flex gap-2">
            {leftBelts.map((belt) => (
              <BeltColumn
                key={belt.id}
                beltId={belt.id}
                beltName={belt.name}
                beltLetter={belt.letter}
                baseNumber={belt.baseNumber}
                spots={belt.spots}
                onSpotClick={(spot) => onBeltSpotClick(spot, belt.id)}
                onSpotDoubleClick={onBeltDoubleClick}
                isManager={isManager}
              />
            ))}
          </div>

          {/* Center: FO */}
          <FOColumn
            spots={foSpots}
            onSpotClick={onFacilitySpotClick}
            isManager={isManager}
          />

          {/* Right side: B Belt, A Belt */}
          <div className="flex gap-2">
            {rightBelts.map((belt) => (
              <BeltColumn
                key={belt.id}
                beltId={belt.id}
                beltName={belt.name}
                beltLetter={belt.letter}
                baseNumber={belt.baseNumber}
                spots={belt.spots}
                onSpotClick={(spot) => onBeltSpotClick(spot, belt.id)}
                onSpotDoubleClick={onBeltDoubleClick}
                isManager={isManager}
              />
            ))}
          </div>
        </div>

        <div className="text-center text-sm text-gray-500 mt-2">EAST</div>
      </div>
    </div>
  );
}
