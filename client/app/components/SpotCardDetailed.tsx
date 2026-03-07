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

interface TimeOffInfo {
  type: string;
  note?: string;
}

interface SpotRoute {
  id: number;
  number: string;
  loadLocation?: string | null;
}

interface SpotCardDetailedProps {
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  route?: SpotRoute | null;
  assignment: SpotAssignment | null;
  timeOffInfo?: TimeOffInfo;
  onClick: () => void;
  isManager: boolean;
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

export function SpotCardDetailed({
  spotNumber,
  beltLetter,
  baseNumber,
  route,
  assignment,
  timeOffInfo,
  onClick,
  isManager,
}: SpotCardDetailedProps) {
  const routeDisplay = route ? `R:${route.number}` : '—';
  const spotName = formatSpotName(beltLetter, spotNumber);

  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 dark:bg-gray-700 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-50 border-red-400 border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing/10 border-swing';
    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600';
  };

  const getAccentClass = () => {
    if (!assignment) return 'bg-gray-200 dark:bg-gray-600';
    if (assignment.needsCoverage) return 'bg-red-500';
    if (assignment.user.role === 'SWING') return 'bg-swing';
    return loadLocationColors[route?.loadLocation || 'UNASSIGNED'] || 'bg-gray-400';
  };

  return (
    <button
      onClick={onClick}
      disabled={!isManager}
      className={`w-full p-4 rounded-lg border transition-all hover:shadow-md text-left flex ${getBackgroundClass()} ${
        isManager ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className={`w-1 rounded-full mr-3 ${getAccentClass()}`}></div>

      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div className="font-semibold text-gray-900 dark:text-white">
            {spotName} {routeDisplay}
          </div>
          {assignment?.needsCoverage && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium">
              OPEN
            </span>
          )}
        </div>

        {assignment ? (
          <>
            <div className={`text-lg ${assignment.needsCoverage ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
              {assignment.user.name}
              {assignment.needsCoverage && timeOffInfo && (
                <span className="text-sm text-red-600 ml-2 no-underline inline">
                  ← OFF ({timeOffInfo.type}{timeOffInfo.note ? `: "${timeOffInfo.note}"` : ''})
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">T: {assignment.truckNumber}</div>
            <div className="flex gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{route?.loadLocation ? `Area: ${route.loadLocation}` : ''}</span>
              {assignment.isOverride ? (
                <span className="text-amber-600">✎ Override</span>
              ) : (
                <span>From Template</span>
              )}
              {assignment.needsCoverage && (
                <span className="text-red-600 font-medium">NEEDS COVERAGE</span>
              )}
            </div>
          </>
        ) : (
          <div className="text-gray-400 dark:text-gray-500">Unassigned</div>
        )}
      </div>
    </button>
  );
}
