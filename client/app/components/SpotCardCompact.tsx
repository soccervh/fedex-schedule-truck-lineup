import { useState } from 'react';
import { formatSpotName } from '../utils/belt';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';

interface SpotAssignment {
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
}

interface TruckAssignment {
  id: string;
  truck: {
    id: number;
    number: string;
    status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  };
}

interface SpotRoute {
  id: number;
  number: string;
  loadLocation?: string | null;
}

interface SpotCardCompactProps {
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  routeOverride?: number | null;
  route?: SpotRoute | null;
  assignment: SpotAssignment | null;
  truckAssignment?: TruckAssignment | null;
  onClick: () => void;
  onDoubleClick: () => void;
  isManager: boolean;
  onTruckDrop?: (truckNumber: string) => void;
  isDragEnabled?: boolean;
  showTruckInHeader?: boolean;
}

const loadLocationColors: Record<string, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
  LABEL_FACER: 'bg-amber-500',
  SCANNER: 'bg-teal-500',
  SPLITTER: 'bg-indigo-500',
  UNASSIGNED: 'bg-gray-400',
};

export function SpotCardCompact({
  spotNumber,
  beltLetter,
  baseNumber,
  routeOverride,
  route,
  assignment,
  truckAssignment,
  onClick,
  onDoubleClick,
  isManager,
  onTruckDrop,
  isDragEnabled = false,
  showTruckInHeader = false,
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

  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-100 border-red-400 border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing text-white';
    const colorKey = route?.loadLocation || 'UNASSIGNED';
    return `${loadLocationColors[colorKey] || 'bg-gray-400'} text-white`;
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
      className={`w-full p-2 rounded border transition-all hover:shadow-md text-left ${getBackgroundClass()} ${
        isManager && truckNumber ? 'cursor-grab active:cursor-grabbing' : isManager ? 'cursor-pointer' : 'cursor-default'
      } ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
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
          {truckNumber && <div className="text-xs opacity-80">T: {truckNumber}</div>}
          {assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700 mt-1">OPEN</div>
          )}
        </>
      ) : (
        <>
          <div className="text-gray-400 text-sm">—</div>
          {truckNumber && <div className="text-xs text-gray-500">T: {truckNumber}</div>}
        </>
      )}
    </button>
  );
}
