import { formatSpotName } from '../utils/belt';

const assignAreaLabels: Record<string, string> = {
  UNASSIGNED: 'Unassigned',
  DOC: 'Doc',
  UNLOAD: 'Unload',
  LABEL_FACER: 'Label Facer',
  SCANNER: 'Scanner',
  SPLITTER: 'Splitter',
  FO: 'FO',
  PULLER: 'Puller',
};

interface CoverageNeed {
  spot: {
    id: number;
    number: number;
    belt: {
      id: number;
      letter: string;
      baseNumber: number;
    };
  };
  route?: {
    id: number;
    number: string;
    loadLocation?: string | null;
  } | null;
  user: {
    name: string;
  };
  reason?: 'unassigned' | 'time_off';
}

interface NeedsFillSidebarProps {
  coverageNeeds: CoverageNeed[];
  onSpotClick: (spotId: number, beltId: number) => void;
}

export function NeedsFillSidebar({ coverageNeeds, onSpotClick }: NeedsFillSidebarProps) {
  return (
    <div className="w-48 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-red-50">
        <h3 className="font-semibold text-red-800">NEEDS FILL</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {coverageNeeds.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">All spots filled</div>
        ) : (
          coverageNeeds.map((need) => {
            const spotName = formatSpotName(need.spot.belt.letter, need.spot.number);
            const routeDisplay = need.route ? `R:${need.route.number}` : '—';
            const areaDisplay = need.route?.loadLocation
              ? assignAreaLabels[need.route.loadLocation] || need.route.loadLocation
              : null;

            return (
              <button
                key={need.spot.id}
                onClick={() => onSpotClick(need.spot.id, need.spot.belt.id)}
                className="w-full p-3 text-left border-b border-gray-100 hover:bg-red-50 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {spotName} {routeDisplay}
                </div>
                {areaDisplay && (
                  <div className="text-xs text-blue-600 font-medium">{areaDisplay}</div>
                )}
                <div className="text-sm text-gray-600 truncate">
                  {need.reason === 'unassigned' ? '(No one assigned)' : `(${need.user.name} off)`}
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">
          {coverageNeeds.length} spot{coverageNeeds.length !== 1 ? 's' : ''} open
        </span>
      </div>
    </div>
  );
}
