interface SwingDriver {
  id: string;
  name: string;
  homeArea: 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';
}

interface SwingDriversSidebarProps {
  swingDrivers: SwingDriver[];
  onDriverClick?: (driver: SwingDriver) => void;
}

export function SwingDriversSidebar({ swingDrivers, onDriverClick }: SwingDriversSidebarProps) {
  return (
    <div className="w-48 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-3 border-b border-gray-200 bg-swing">
        <h3 className="font-semibold text-white">SWING DRIVERS</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {swingDrivers.length === 0 ? (
          <div className="p-3 text-sm text-gray-500">No swing drivers</div>
        ) : (
          swingDrivers.map((driver) => (
            <button
              key={driver.id}
              onClick={() => onDriverClick?.(driver)}
              className="w-full p-3 text-left border-b border-gray-100 hover:bg-purple-50 transition-colors"
            >
              <div className="font-medium text-gray-900">{driver.name}</div>
              <div className="text-sm text-gray-600">{driver.homeArea}</div>
            </button>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm font-medium text-gray-700">
          {swingDrivers.length} driver{swingDrivers.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}
