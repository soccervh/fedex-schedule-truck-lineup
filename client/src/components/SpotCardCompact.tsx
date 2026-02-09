import { calculateRouteNumber, formatSpotName, formatRouteDisplay } from '../utils/belt';

interface SpotAssignment {
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
}

interface SpotCardCompactProps {
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  assignment: SpotAssignment | null;
  onClick: () => void;
  onDoubleClick: () => void;
  isManager: boolean;
}

const areaColors = {
  BELT: 'bg-belt',
  DOCK: 'bg-dock',
  UNLOAD: 'bg-unload',
};

export function SpotCardCompact({
  spotNumber,
  beltLetter,
  baseNumber,
  assignment,
  onClick,
  onDoubleClick,
  isManager,
}: SpotCardCompactProps) {
  const routeNumber = calculateRouteNumber(baseNumber, spotNumber);
  const spotName = formatSpotName(beltLetter, spotNumber);

  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-100 border-red-400 border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing text-white';
    return `${areaColors[assignment.user.homeArea]} text-white`;
  };

  return (
    <button
      onClick={onClick}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      disabled={!isManager && !assignment?.needsCoverage}
      className={`w-full p-2 rounded border transition-all hover:shadow-md text-left ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex justify-between items-center text-xs font-medium opacity-90">
        <span>{spotName}</span>
        <span>{formatRouteDisplay(routeNumber)}</span>
      </div>
      {assignment ? (
        <>
          <div className={`font-semibold truncate text-sm ${assignment.needsCoverage ? 'line-through opacity-60' : ''}`}>
            {assignment.user.name}
          </div>
          <div className="text-xs opacity-80">T: {assignment.truckNumber}</div>
          {assignment.needsCoverage && (
            <div className="text-xs font-bold text-red-700 mt-1">OPEN</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-sm">—</div>
      )}
    </button>
  );
}
