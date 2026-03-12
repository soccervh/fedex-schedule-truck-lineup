import { useState } from 'react';
import { BeltColumn } from './BeltColumn';
import { UnloadSection } from './UnloadSection';
import { SortSection } from './SortSection';
import { DocSection } from './DocSection';
import { FOSection } from './FOSection';
import { LateStarterSection } from './LateStarterSection';
import { getStartTime, DEFAULT_CONFIG } from '../utils/startTimes';
import type { StartTimeConfig } from '../utils/startTimes';

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
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
    };
    needsCoverage: boolean;
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
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
    };
    needsCoverage?: boolean;
  } | null;
}

interface FacilityArea {
  name: string;
  subArea: string | null;
  spots: FacilitySpot[];
}

interface RouteAssignment {
  id: number;
  number: string;
  facilitySpotId: number | null;
  driver: { id: string; name: string } | null;
  driverIsOff: boolean;
}

interface FacilityViewProps {
  belts: Belt[];
  facilityAreas: Record<string, FacilityArea>;
  routeAssignments?: { FO: RouteAssignment[]; DOC: RouteAssignment[]; UNLOAD: RouteAssignment[]; SORT: RouteAssignment[]; LATE_STARTER: RouteAssignment[] };
  onBeltSpotClick: (spot: BeltSpot, beltId: number) => void;
  onFacilitySpotClick: (spot: FacilitySpot, sectionName: string) => void;
  onBeltDoubleClick: (beltId: number) => void;
  isManager: boolean;
  selectedDate: string;
  startTimeConfig?: StartTimeConfig;
}

export function FacilityView({
  belts,
  facilityAreas,
  routeAssignments,
  onBeltSpotClick,
  onFacilitySpotClick,
  onBeltDoubleClick,
  isManager,
  selectedDate,
  startTimeConfig,
}: FacilityViewProps) {
  const config = startTimeConfig || DEFAULT_CONFIG;
  const [activeBeltTab, setActiveBeltTab] = useState(0);

  // Detect Saturday
  const isSaturday = new Date(selectedDate + 'T12:00:00').getDay() === 6;

  // Organize belts based on day
  const leftBelts = isSaturday ? [] : belts.filter(b => b.letter === 'D' || b.letter === 'C')
    .sort((a, b) => b.baseNumber - a.baseNumber);
  const rightBelts = belts.filter(b => b.letter === 'B' || b.letter === 'A')
    .sort((a, b) => b.baseNumber - a.baseNumber);

  const allBelts = [...leftBelts, ...rightBelts];

  // Get facility areas — keys differ between weekday and Saturday
  const unloadDC = isSaturday ? [] : facilityAreas['UNLOAD-D/C Side']?.spots || [];
  const unloadBA = isSaturday
    ? facilityAreas['UNLOAD-Saturday']?.spots || []
    : facilityAreas['UNLOAD-B/A Side']?.spots || [];
  const secondary = isSaturday
    ? facilityAreas['DOC-SAT-Secondary']?.spots || []
    : facilityAreas['DOC-Secondary']?.spots || [];
  const qbUpper = isSaturday ? [] : facilityAreas['DOC-Quarterback Upper']?.spots || [];
  const fineSort = isSaturday
    ? facilityAreas['DOC-SAT-Fine Sort']?.spots || []
    : facilityAreas['DOC-Fine Sort']?.spots || [];
  const qbLowerAll = isSaturday ? [] : facilityAreas['DOC-Quarterback Lower']?.spots || [];
  const qbLower = qbLowerAll.filter(s => s.label === 'QB3');
  const ramps = qbLowerAll.filter(s => s.label?.startsWith('Ramp'));
  const sortDC = isSaturday ? [] : facilityAreas['SORT-D/C Side']?.spots || [];
  const sortBA = isSaturday
    ? facilityAreas['SORT-Saturday']?.spots || []
    : facilityAreas['SORT-B/A Side']?.spots || [];
  const foSpots = isSaturday
    ? facilityAreas['FO-Saturday']?.spots || []
    : facilityAreas['FO-default']?.spots || [];

  const selectedBelt = allBelts[activeBeltTab];

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4">
      {/* UNLOAD Section */}
      <UnloadSection
        dcSpots={unloadDC}
        baSpots={unloadBA}
        routes={routeAssignments?.UNLOAD || []}
        onSpotClick={(spot) => onFacilitySpotClick(spot, 'UNLOAD')}
        isManager={isManager}
        startTime={getStartTime('UNLOAD', selectedDate, config)}
      />

      {/* SORT Section */}
      <SortSection
        dcSpots={sortDC}
        baSpots={sortBA}
        routes={routeAssignments?.SORT || []}
        onSpotClick={(spot) => onFacilitySpotClick(spot, 'SORT')}
        isManager={isManager}
        startTime={getStartTime('SORT', selectedDate, config)}
      />

      {/* DOC Section */}
      <DocSection
        secondarySpots={secondary}
        quarterbackUpperSpots={qbUpper}
        fineSortSpots={fineSort}
        quarterbackLowerSpots={qbLower}
        rampSpots={ramps}
        routes={routeAssignments?.DOC || []}
        onSpotClick={(spot) => onFacilitySpotClick(spot, 'DOC')}
        isManager={isManager}
        sortStartTime={getStartTime('DOC_SORT', selectedDate, config)}
        rampStartTime={getStartTime('DOC_RAMP', selectedDate, config)}
      />

      {/* FO Section */}
      <FOSection
        spots={foSpots}
        routes={routeAssignments?.FO || []}
        onSpotClick={(spot) => onFacilitySpotClick(spot, 'FO')}
        isManager={isManager}
        startTime={getStartTime('FO', selectedDate, config)}
      />

      {/* Late Starter Section - weekday only */}
      {!isSaturday && (
        <LateStarterSection
          routes={routeAssignments?.LATE_STARTER || []}
          startTime={getStartTime('LATE_STARTER', selectedDate, config)}
        />
      )}

      {/* BELTS Section */}
      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shrink-0">
        <div className="text-center font-semibold text-gray-800 dark:text-gray-100 mb-3">BELTS</div>

        {/* Desktop: show belts side-by-side */}
        <div className="hidden md:block">
          {!isSaturday && <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">WEST</div>}
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
          {!isSaturday && <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">EAST</div>}
        </div>

        {/* Mobile: belt tabs */}
        <div className="md:hidden">
          {/* Tab bar */}
          <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1 mb-3">
            {allBelts.map((belt, idx) => (
              <button
                key={belt.id}
                onClick={() => setActiveBeltTab(idx)}
                className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                  activeBeltTab === idx
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
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
