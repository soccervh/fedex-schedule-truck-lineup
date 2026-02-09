import { calculateRouteNumber, formatSpotName, formatRouteDisplay } from '../utils/belt';

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
  user: {
    name: string;
  };
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
            const routeNum = calculateRouteNumber(need.spot.belt.baseNumber, need.spot.number);

            return (
              <button
                key={need.spot.id}
                onClick={() => onSpotClick(need.spot.id, need.spot.belt.id)}
                className="w-full p-3 text-left border-b border-gray-100 hover:bg-red-50 transition-colors"
              >
                <div className="font-medium text-gray-900">
                  {spotName} {formatRouteDisplay(routeNum)}
                </div>
                <div className="text-sm text-gray-600 truncate">
                  ({need.user.name} off)
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
