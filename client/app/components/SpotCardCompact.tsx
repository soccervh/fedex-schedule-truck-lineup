import { useState } from 'react';
import { formatSpotName } from '../utils/belt';

interface SpotAssignment {
  id: string;
  truckNumber: string;
  isOverride: boolean;
  user: {
    id: string;
    name: string;
    role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
  };
  needsCoverage: boolean;
}

interface TruckAssignment {
  id: string;
  truck: {
    id: number;
    number: string;
    status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
    truckType?: string;
    homeSpotId?: number | null;
  };
}

interface SpotRoute {
  id: number;
  number: string;
  loadLocation?: string | null;
}

interface PulledRoute {
  id: number;
  number: string;
}

interface SpotCardCompactProps {
  spotId: number;
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  routeOverride?: number | null;
  route?: SpotRoute | null;
  pulledRoutes?: PulledRoute[];
  assignment: SpotAssignment | null;
  truckAssignment?: TruckAssignment | null;
  onClick: () => void;
  onDoubleClick: () => void;
  isManager: boolean;
  onTruckDrop?: (truckNumber: string) => void;
  isDragEnabled?: boolean;
  showTruckInHeader?: boolean;
  showHomeMismatch?: boolean;
  highlightTruck?: string;
}

const truckTypeLabel = (t?: string) => {
  const labels: Record<string, string> = { REACH: 'Reach', NINE_HUNDRED: '900', SPRINTER: 'Sprinter', VAN: 'Van', RENTAL: 'Rental', UNKNOWN: 'Unknown' };
  return t ? labels[t] || t : '';
};

const loadLocationColors: Record<string, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
  SORT: 'bg-purple-500',
  LABEL_FACER: 'bg-purple-500',
  SCANNER: 'bg-purple-500',
  SPLITTER: 'bg-purple-500',
  UNASSIGNED: 'bg-gray-400',
};

const loadLocationLeftStripe: Record<string, string> = {
  FO: 'border-l-blue-500',
  DOC: 'border-l-orange-500',
  UNLOAD: 'border-l-green-500',
  PULLER: 'border-l-yellow-500',
  SORT: 'border-l-purple-500',
  LABEL_FACER: 'border-l-purple-500',
  SCANNER: 'border-l-purple-500',
  SPLITTER: 'border-l-purple-500',
  UNASSIGNED: 'border-l-gray-300',
};

export function SpotCardCompact({
  spotId,
  spotNumber,
  beltLetter,
  baseNumber,
  routeOverride,
  route,
  pulledRoutes,
  assignment,
  truckAssignment,
  onClick,
  onDoubleClick,
  isManager,
  onTruckDrop,
  isDragEnabled = false,
  showTruckInHeader = false,
  showHomeMismatch = false,
  highlightTruck,
}: SpotCardCompactProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const routeDisplay = route ? `R:${route.number}` : '—';
  const spotName = formatSpotName(beltLetter, spotNumber);

  const handleDragOver = (e: React.DragEvent) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isDragEnabled || !onTruckDrop) return;
    const truckNumber = e.dataTransfer.getData('text/plain');
    if (truckNumber) {
      onTruckDrop(truckNumber);
    }
  };

  // Get truck number - prefer independent truck assignment, fall back to driver assignment's truck
  const truckNumber = truckAssignment?.truck.number || assignment?.truckNumber;
  const isHighlighted = !!(highlightTruck && truckNumber && truckNumber.toLowerCase().includes(highlightTruck.toLowerCase()));

  // The truck in this spot has a different home spot (it's not where it belongs)
  const isMismatch = showHomeMismatch && truckAssignment &&
    truckAssignment.truck.homeSpotId != null &&
    truckAssignment.truck.homeSpotId !== spotId;

  const colorKey = route?.loadLocation || 'UNASSIGNED';
  const leftStripe = `border-l-4 ${loadLocationLeftStripe[colorKey] || 'border-l-gray-300'}`;

  const getBackgroundClass = () => {
    if (!assignment) return `bg-gray-50 border border-gray-300 ${leftStripe}`;
    if (assignment.user.role === 'SWING') return `bg-swing text-white border border-gray-600 ${leftStripe}`;
    return `${loadLocationColors[colorKey] || 'bg-gray-400'} text-white border border-gray-600 ${leftStripe}`;
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isManager || !truckNumber) return;
    e.dataTransfer.setData('text/plain', truckNumber);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      draggable={isManager && !!truckNumber}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={!isManager && !assignment?.needsCoverage}
      className={`w-full p-2 rounded transition-all hover:shadow-md text-left ${getBackgroundClass()} ${
        assignment?.needsCoverage ? 'outline outline-3 outline-red-500 outline-offset-1' : ''
      } ${
        isManager && truckNumber ? 'cursor-grab active:cursor-grabbing' : isManager ? 'cursor-pointer' : 'cursor-default'
      } ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2' : isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : isMismatch ? 'ring-2 ring-amber-400' : ''}`}
    >
      <div className="flex justify-between items-center text-xs font-medium opacity-90">
        <span>{spotName}</span>
        <span>{showTruckInHeader ? (truckNumber ? `T:${truckNumber}` : '—') : routeDisplay}</span>
      </div>
      {assignment ? (
        <>
          <div className={`font-semibold truncate text-sm ${assignment.needsCoverage ? 'line-through opacity-60' : ''}`}>
            {assignment.user.name}
          </div>
          {truckNumber && (
            <div className="text-xs opacity-80">
              T: {truckNumber}
              {truckAssignment?.truck.truckType && truckAssignment.truck.truckType !== 'UNKNOWN' && (
                <span className="ml-1">({truckTypeLabel(truckAssignment.truck.truckType)})</span>
              )}
            </div>
          )}
          {assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700 mt-1">OPEN</div>
          )}
        </>
      ) : (
        <>
          <div className="text-gray-400 text-sm">—</div>
          {truckNumber && (
            <div className="text-xs text-gray-500">
              T: {truckNumber}
              {truckAssignment?.truck.truckType && truckAssignment.truck.truckType !== 'UNKNOWN' && (
                <span className="ml-1">({truckTypeLabel(truckAssignment.truck.truckType)})</span>
              )}
            </div>
          )}
        </>
      )}
      {pulledRoutes && pulledRoutes.length > 0 && (
        <div className="text-[10px] text-yellow-300 mt-0.5 truncate w-full">
          Pulls: {pulledRoutes.map(r => r.number).join(', ')}
        </div>
      )}
    </button>
  );
}
