import { calculateRouteNumber, formatSpotName, formatRouteDisplay } from '../utils/belt';

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

interface TimeOffInfo {
  type: string;
  note?: string;
}

interface SpotCardDetailedProps {
  spotNumber: number;
  beltLetter: string;
  baseNumber: number;
  assignment: SpotAssignment | null;
  timeOffInfo?: TimeOffInfo;
  onClick: () => void;
  isManager: boolean;
}

const areaColors: Record<HomeArea, string> = {
  FO: 'bg-fo',
  DOC: 'bg-doc',
  UNLOAD: 'bg-unload',
  PULLER: 'bg-puller',
  UNASSIGNED: 'bg-gray-400',
};

const areaLabels: Record<HomeArea, string> = {
  FO: 'FO',
  DOC: 'Doc',
  UNLOAD: 'Unload',
  PULLER: 'Puller',
  UNASSIGNED: 'Unassigned',
};

export function SpotCardDetailed({
  spotNumber,
  beltLetter,
  baseNumber,
  assignment,
  timeOffInfo,
  onClick,
  isManager,
}: SpotCardDetailedProps) {
  const routeNumber = calculateRouteNumber(baseNumber, spotNumber);
  const spotName = formatSpotName(beltLetter, spotNumber);

  const getBackgroundClass = () => {
    if (!assignment) return 'bg-gray-50 border-dashed';
    if (assignment.needsCoverage) return 'bg-red-50 border-red-400 border-2';
    if (assignment.user.role === 'SWING') return 'bg-swing/10 border-swing';
    return 'bg-white border-gray-200';
  };

  const getAccentClass = () => {
    if (!assignment) return 'bg-gray-200';
    if (assignment.needsCoverage) return 'bg-red-500';
    if (assignment.user.role === 'SWING') return 'bg-swing';
    return areaColors[assignment.user.homeArea];
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
          <div className="font-semibold text-gray-900">
            {spotName} {formatRouteDisplay(routeNumber)}
          </div>
          {assignment?.needsCoverage && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium">
              OPEN
            </span>
          )}
        </div>

        {assignment ? (
          <>
            <div className={`text-lg ${assignment.needsCoverage ? 'line-through text-gray-400' : 'text-gray-900'}`}>
              {assignment.user.name}
              {assignment.needsCoverage && timeOffInfo && (
                <span className="text-sm text-red-600 ml-2 no-underline inline">
                  ← OFF ({timeOffInfo.type}{timeOffInfo.note ? `: "${timeOffInfo.note}"` : ''})
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600">T: {assignment.truckNumber}</div>
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span>Home: {areaLabels[assignment.user.homeArea]}</span>
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
          <div className="text-gray-400">Unassigned</div>
        )}
      </div>
    </button>
  );
}
