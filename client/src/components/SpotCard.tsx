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

interface SpotCardProps {
  spotNumber: number;
  assignment: SpotAssignment | null;
  onClick: () => void;
  isManager: boolean;
}

const areaColors = {
  BELT: 'bg-belt',
  DOCK: 'bg-dock',
  UNLOAD: 'bg-unload',
};

export function SpotCard({ spotNumber, assignment, onClick, isManager }: SpotCardProps) {
  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-50 border-coverage border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing text-white';
    return `${areaColors[assignment.user.homeArea]} text-white`;
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager && !assignment?.needsCoverage}
      className={`p-3 rounded-lg border transition-all hover:shadow-md ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="text-xs font-medium opacity-75">Spot {spotNumber}</div>
      {assignment ? (
        <>
          <div className={`font-semibold truncate ${assignment.needsCoverage ? 'line-through text-gray-500' : ''}`}>
            {assignment.user.name}
          </div>
          <div className="text-sm opacity-90">{assignment.truckNumber}</div>
          {assignment.needsCoverage && (
            <div className="text-xs font-bold text-coverage mt-1">
              NEEDS COVERAGE
            </div>
          )}
          {assignment.isOverride && !assignment.needsCoverage && (
            <div className="text-xs opacity-75 mt-1">Override</div>
          )}
        </>
      ) : (
        <div className="text-gray-400 text-sm">Unassigned</div>
      )}
    </button>
  );
}
