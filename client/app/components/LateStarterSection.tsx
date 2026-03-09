import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RouteAssignment {
  id: number;
  number: string;
  facilitySpotId: number | null;
  driver: { id: string; name: string; role?: string } | null;
  driverIsOff: boolean;
}

interface LateStarterSectionProps {
  routes?: RouteAssignment[];
  defaultExpanded?: boolean;
}

function formatName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export function LateStarterSection({
  routes = [],
  defaultExpanded = true,
}: LateStarterSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const filled = routes.filter(r => r.driver && !r.driverIsOff).length;

  return (
    <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg overflow-hidden shrink-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors text-sm"
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        LATE STARTER ({filled}/{routes.length})
      </button>
      {expanded && routes.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-1 justify-center">
            {routes.map(route => (
              <div
                key={route.id}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  route.driver && !route.driverIsOff
                    ? route.driver.role === 'SWING' ? 'bg-swing text-white' : 'bg-amber-500 text-white'
                    : 'bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 border border-amber-300 dark:border-amber-600'
                }`}
              >
                R:{route.number}{route.driver && !route.driverIsOff ? ` ${formatName(route.driver.name)}` : ''}
              </div>
            ))}
          </div>
        </div>
      )}
      {expanded && routes.length === 0 && (
        <div className="px-3 pb-3 text-center text-xs text-amber-500 dark:text-amber-400">
          No late starters
        </div>
      )}
    </div>
  );
}
