import { useState } from 'react';
import { BeltColumn } from './BeltColumn';
import { UnloadSection } from './UnloadSection';
import { SortSection } from './SortSection';
import { DocSection } from './DocSection';
import { FOSection } from './FOSection';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';

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
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
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
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
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
  const [activeBeltTab, setActiveBeltTab] = useState(0);

  // Organize belts: D, C on left; B, A on right
  const leftBelts = belts.filter(b => b.letter === 'D' || b.letter === 'C')
    .sort((a, b) => b.baseNumber - a.baseNumber); // D first, then C
  const rightBelts = belts.filter(b => b.letter === 'B' || b.letter === 'A')
    .sort((a, b) => b.baseNumber - a.baseNumber); // B first, then A

  // All belts in tab order: D, C, B, A
  const allBelts = [...leftBelts, ...rightBelts];

  // Get facility areas
  const unloadDC = facilityAreas['UNLOAD-D/C Side']?.spots || [];
  const unloadBA = facilityAreas['UNLOAD-B/A Side']?.spots || [];
  const secondary = facilityAreas['DOC-Secondary']?.spots || [];
  const qbUpper = facilityAreas['DOC-Quarterback Upper']?.spots || [];
  const fineSort = facilityAreas['DOC-Fine Sort']?.spots || [];
  const qbLowerAll = facilityAreas['DOC-Quarterback Lower']?.spots || [];
  const qbLower = qbLowerAll.filter(s => s.label === 'QB3');
  const ramps = qbLowerAll.filter(s => s.label?.startsWith('Ramp'));
  const sortDC = facilityAreas['SORT-D/C Side']?.spots || [];
  const sortBA = facilityAreas['SORT-B/A Side']?.spots || [];
  const foSpots = facilityAreas['FO-default']?.spots || [];

  const selectedBelt = allBelts[activeBeltTab];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4">
      {/* UNLOAD Section */}
      <UnloadSection
        dcSpots={unloadDC}
        baSpots={unloadBA}
        onSpotClick={onFacilitySpotClick}
        isManager={isManager}
      />

      {/* SORT Section */}
      <SortSection
        dcSpots={sortDC}
        baSpots={sortBA}
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

      {/* FO Section */}
      <FOSection
        spots={foSpots}
        onSpotClick={onFacilitySpotClick}
        isManager={isManager}
      />

      {/* BELTS Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 shrink-0">
        <div className="text-center font-semibold text-gray-800 mb-3">BELTS</div>

        {/* Desktop: show all belts side-by-side */}
        <div className="hidden md:block">
          <div className="text-center text-sm text-gray-500 mb-2">WEST</div>
          <div className="flex gap-2 justify-center overflow-x-auto pb-4">
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
          <div className="text-center text-sm text-gray-500 mt-2">EAST</div>
        </div>

        {/* Mobile: belt tabs */}
        <div className="md:hidden">
          {/* Tab bar */}
          <div className="flex bg-gray-200 rounded-lg p-1 mb-3">
            {allBelts.map((belt, idx) => (
              <button
                key={belt.id}
                onClick={() => setActiveBeltTab(idx)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  activeBeltTab === idx
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600'
                }`}
              >
                {belt.letter} Belt
              </button>
            ))}
          </div>

          {/* Single belt view */}
          {selectedBelt && (
            <div className="flex justify-center">
              <BeltColumn
                beltId={selectedBelt.id}
                beltName={selectedBelt.name}
                beltLetter={selectedBelt.letter}
                baseNumber={selectedBelt.baseNumber}
                spots={selectedBelt.spots}
                onSpotClick={(spot) => onBeltSpotClick(spot, selectedBelt.id)}
                onSpotDoubleClick={onBeltDoubleClick}
                isManager={isManager}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
