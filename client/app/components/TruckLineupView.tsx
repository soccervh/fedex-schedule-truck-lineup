import { BeltColumn } from './BeltColumn';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, Search } from 'lucide-react';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';

interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE' | 'RETIRED';
  truckType?: string;
  note?: string;
  retiredAt?: string | null;
}

interface BeltSpot {
  id: number;
  number: number;
  assignment: {
    id: string;
    truckNumber: string;
    isOverride: boolean;
    user: {
      id: string;
      name: string;
      homeArea: HomeArea;
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage: boolean;
    originalUserHomeArea?: HomeArea;
  } | null;
  truckAssignment?: {
    id: string;
    truck: TruckData;
  } | null;
}

interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: BeltSpot[];
}

interface TruckLineupViewProps {
  belts: Belt[];
  availableTrucks: TruckData[];
  outOfServiceTrucks: TruckData[];
  retiredTrucks?: TruckData[];
  onBeltSpotClick: (spot: BeltSpot, beltId: number) => void;
  onBeltDoubleClick: (beltId: number) => void;
  isManager: boolean;
  onAddTruck?: () => void;
  onTruckClick?: (truck: TruckData) => void;
  onOutOfServiceTruckClick?: (truck: TruckData) => void;
  onRetiredTruckClick?: (truck: TruckData) => void;
  onTruckDropOnSpot?: (spot: BeltSpot, beltId: number, truckNumber: string) => void;
  onTruckDropOnAvailable?: (truckNumber: string) => void;
  onTruckDropOnOutOfService?: (truckNumber: string) => void;
}

import { useState } from 'react';

const truckTypeLabel = (t?: string) => {
  const labels: Record<string, string> = { REACH: 'Reach', NINE_HUNDRED: '900', SPRINTER: 'Sprinter', VAN: 'Van', RENTAL: 'Rental', UNKNOWN: 'Unknown' };
  return t ? labels[t] || t : '';
};

function TruckSidebar({
  title,
  trucks,
  variant,
  onAddTruck,
  onTruckClick,
  onTruckDrop,
  highlightTruck,
}: {
  title: string;
  trucks: TruckData[];
  variant: 'available' | 'out-of-service';
  onAddTruck?: () => void;
  onTruckClick?: (truck: TruckData) => void;
  onTruckDrop?: (truckNumber: string) => void;
  highlightTruck?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const bgColor = variant === 'available' ? 'bg-green-50' : 'bg-red-50';
  const borderColor = variant === 'available' ? 'border-green-200' : 'border-red-200';
  const headerColor = variant === 'available' ? 'bg-green-600' : 'bg-red-600';
  const badgeColor = variant === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  const handleDragOver = (e: React.DragEvent) => {
    if (!onTruckDrop) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!onTruckDrop) return;
    const truckNumber = e.dataTransfer.getData('text/plain');
    if (truckNumber) {
      onTruckDrop(truckNumber);
    }
  };

  return (
    <div
      className={`w-48 ${bgColor} border ${borderColor} rounded-lg flex flex-col ${isDragOver ? 'ring-2 ring-offset-2 ' + (variant === 'available' ? 'ring-green-500' : 'ring-red-500') : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`${headerColor} text-white text-center py-2 font-semibold rounded-t-lg flex items-center justify-center gap-2`}>
        {title}
        {onAddTruck && (
          <button
            onClick={onAddTruck}
            className="bg-white/20 hover:bg-white/30 rounded p-1 transition-colors"
            title="Add truck"
          >
            <Plus size={16} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {trucks.length === 0 ? (
          <div className="text-gray-400 text-center text-sm py-4">
            {onTruckDrop ? 'Drop truck here' : 'None'}
          </div>
        ) : (
          trucks.map((truck) => {
            const isHighlighted = !!(highlightTruck && truck.number.toLowerCase().includes(highlightTruck.toLowerCase()));
            return (
            <div
              key={truck.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', truck.number);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => onTruckClick?.(truck)}
              className={`${badgeColor} rounded p-2 text-sm cursor-grab active:cursor-grabbing ${onTruckClick ? 'hover:opacity-80' : ''} ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              <div className="font-semibold">{truck.number}</div>
              {truck.truckType && truck.truckType !== 'UNKNOWN' && (
                <div className="text-xs opacity-75">{truckTypeLabel(truck.truckType)}</div>
              )}
              {truck.note && (
                <div className="text-xs opacity-75 mt-1">{truck.note}</div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Mobile inline truck panel
function MobileTruckPanel({
  title,
  trucks,
  variant,
  onClose,
  onAddTruck,
  onTruckClick,
  highlightTruck,
}: {
  title: string;
  trucks: TruckData[];
  variant: 'available' | 'out-of-service';
  onClose: () => void;
  onAddTruck?: () => void;
  onTruckClick?: (truck: TruckData) => void;
  highlightTruck?: string;
}) {
  const headerColor = variant === 'available' ? 'bg-green-600' : 'bg-red-600';
  const bgColor = variant === 'available' ? 'bg-green-50' : 'bg-red-50';
  const borderColor = variant === 'available' ? 'border-green-200' : 'border-red-200';
  const badgeColor = variant === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';

  return (
    <div className={`w-36 shrink-0 ${bgColor} border ${borderColor} rounded-lg flex flex-col overflow-hidden`}>
      <div className={`${headerColor} text-white py-2 px-3 font-semibold flex items-center justify-between text-sm`}>
        <span className="flex items-center gap-1">
          {title}
          {onAddTruck && (
            <button
              onClick={onAddTruck}
              className="bg-white/20 hover:bg-white/30 rounded p-0.5 transition-colors"
            >
              <Plus size={14} />
            </button>
          )}
        </span>
        <button onClick={onClose} className="p-0.5">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {trucks.length === 0 ? (
          <div className="text-gray-400 text-center text-xs py-3">None</div>
        ) : (
          trucks.map((truck) => {
            const isHighlighted = !!(highlightTruck && truck.number.toLowerCase().includes(highlightTruck.toLowerCase()));
            return (
            <div
              key={truck.id}
              onClick={() => onTruckClick?.(truck)}
              className={`${badgeColor} rounded p-2 text-sm ${onTruckClick ? 'active:opacity-70' : ''} ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
            >
              <div className="font-semibold">{truck.number}</div>
              {truck.truckType && truck.truckType !== 'UNKNOWN' && (
                <div className="text-xs opacity-75">{truckTypeLabel(truck.truckType)}</div>
              )}
              {truck.note && (
                <div className="text-xs opacity-75 mt-0.5">{truck.note}</div>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RetiredTrucksPanel({
  trucks,
  onTruckClick,
}: {
  trucks: TruckData[];
  onTruckClick?: (truck: TruckData) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="w-48 bg-gray-50 border border-gray-200 rounded-lg flex flex-col">
      <button
        onClick={() => setExpanded(!expanded)}
        className="bg-gray-500 text-white text-center py-2 font-semibold rounded-t-lg flex items-center justify-center gap-2"
      >
        Retired ({trucks.length})
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {trucks.length === 0 ? (
            <div className="text-gray-400 text-center text-sm py-4">None</div>
          ) : (
            trucks.map((truck) => (
              <div
                key={truck.id}
                onClick={() => onTruckClick?.(truck)}
                className={`bg-gray-100 text-gray-800 rounded p-2 text-sm ${onTruckClick ? 'cursor-pointer hover:bg-gray-200' : ''}`}
              >
                <div className="font-semibold">{truck.number}</div>
                {truck.retiredAt && (
                  <div className="text-xs text-gray-500">
                    Retired: {new Date(truck.retiredAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MobileRetiredPanel({
  trucks,
  onClose,
  onTruckClick,
}: {
  trucks: TruckData[];
  onClose: () => void;
  onTruckClick?: (truck: TruckData) => void;
}) {
  return (
    <div className="w-36 shrink-0 bg-gray-50 border border-gray-200 rounded-lg flex flex-col overflow-hidden">
      <div className="bg-gray-500 text-white py-2 px-3 font-semibold flex items-center justify-between text-sm">
        <span>Retired</span>
        <button onClick={onClose} className="p-0.5">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {trucks.length === 0 ? (
          <div className="text-gray-400 text-center text-xs py-3">None</div>
        ) : (
          trucks.map((truck) => (
            <div
              key={truck.id}
              onClick={() => onTruckClick?.(truck)}
              className={`bg-gray-100 text-gray-800 rounded p-2 text-sm ${onTruckClick ? 'active:opacity-70' : ''}`}
            >
              <div className="font-semibold">{truck.number}</div>
              {truck.retiredAt && (
                <div className="text-xs text-gray-500">
                  {new Date(truck.retiredAt).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function TruckLineupView({
  belts,
  availableTrucks,
  outOfServiceTrucks,
  retiredTrucks = [],
  onBeltSpotClick,
  onBeltDoubleClick,
  isManager,
  onAddTruck,
  onTruckClick,
  onOutOfServiceTruckClick,
  onRetiredTruckClick,
  onTruckDropOnSpot,
  onTruckDropOnAvailable,
  onTruckDropOnOutOfService,
}: TruckLineupViewProps) {
  const [activeBeltTab, setActiveBeltTab] = useState(0);
  const [mobileDrawer, setMobileDrawer] = useState<'oos' | 'available' | 'retired' | null>(null);
  const [truckSearch, setTruckSearch] = useState('');

  // Desktop: D, C, B, A (left to right, matching physical layout)
  const orderedBelts = [...belts].sort((a, b) => b.baseNumber - a.baseNumber);
  // Mobile tabs: A, B, C, D (alphabetical)
  const mobileBelts = [...belts].sort((a, b) => a.baseNumber - b.baseNumber);

  // Find where a searched truck is located
  const truckSearchResult = (() => {
    if (!truckSearch) return null;
    const q = truckSearch.toLowerCase();

    // Check belt spots
    for (const belt of belts) {
      for (const spot of belt.spots) {
        const spotTruck = spot.truckAssignment?.truck.number || spot.assignment?.truckNumber;
        if (spotTruck && spotTruck.toLowerCase().includes(q)) {
          const spotName = `${belt.letter}${spot.number}`;
          return { truck: spotTruck, location: `at ${spotName}`, beltLetter: belt.letter };
        }
      }
    }

    // Check available trucks
    for (const truck of availableTrucks) {
      if (truck.number.toLowerCase().includes(q)) {
        return { truck: truck.number, location: 'in Available', beltLetter: null };
      }
    }

    // Check OOS trucks
    for (const truck of outOfServiceTrucks) {
      if (truck.number.toLowerCase().includes(q)) {
        return { truck: truck.number, location: 'in Out of Service', beltLetter: null };
      }
    }

    // Check retired trucks
    for (const truck of retiredTrucks) {
      if (truck.number.toLowerCase().includes(q)) {
        return { truck: truck.number, location: 'in Retired', beltLetter: null };
      }
    }

    return { truck: truckSearch, location: 'not found', beltLetter: null };
  })();

  // Auto-switch mobile belt tab when truck is found on a belt
  const handleTruckSearchChange = (value: string) => {
    setTruckSearch(value);
    if (value) {
      const q = value.toLowerCase();
      for (let i = 0; i < mobileBelts.length; i++) {
        const belt = mobileBelts[i];
        for (const spot of belt.spots) {
          const spotTruck = spot.truckAssignment?.truck.number || spot.assignment?.truckNumber;
          if (spotTruck && spotTruck.toLowerCase().includes(q)) {
            setActiveBeltTab(i);
            return;
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Search bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={truckSearch}
            onChange={(e) => handleTruckSearchChange(e.target.value)}
            placeholder="Find truck..."
            className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md w-48"
          />
        </div>
        {truckSearchResult && (
          <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${
            truckSearchResult.location === 'not found'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {truckSearchResult.truck} {truckSearchResult.location}
          </span>
        )}
      </div>

    <div className="flex flex-1 gap-4 min-h-0">
      {/* ===== DESKTOP LAYOUT ===== */}
      {/* Left sidebar - Out of Service (desktop only) */}
      <div className="hidden md:flex">
        <TruckSidebar
          title="Out of Service"
          trucks={outOfServiceTrucks}
          variant="out-of-service"
          onTruckClick={isManager ? onOutOfServiceTruckClick : undefined}
          onTruckDrop={isManager ? onTruckDropOnOutOfService : undefined}
          highlightTruck={truckSearch}
        />
      </div>

      {/* Main content - Belts (desktop) */}
      <div className="hidden md:flex flex-1 flex-col overflow-hidden">
        <div className="text-center text-sm text-gray-500 mb-2">WEST</div>

        <div className="flex-1 flex gap-2 justify-center overflow-x-auto overflow-y-auto pb-4">
          {orderedBelts.map((belt) => (
            <BeltColumn
              key={belt.id}
              beltId={belt.id}
              beltName={belt.name}
              beltLetter={belt.letter}
              baseNumber={belt.baseNumber}
              spots={belt.spots}
              onSpotClick={(spot) => onBeltSpotClick(spot, belt.id)}
              onSpotDoubleClick={onBeltDoubleClick}
              isManager={isManager}
              isDragEnabled={!!onTruckDropOnSpot}
              onTruckDrop={onTruckDropOnSpot ? (spot, truckNumber) => onTruckDropOnSpot(spot, belt.id, truckNumber) : undefined}
              highlightTruck={truckSearch}
            />
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 mt-2">EAST</div>
      </div>

      {/* Right sidebar - Available/Spare + Retired (desktop only) */}
      <div className="hidden md:flex md:flex-col gap-4 overflow-y-auto">
        <TruckSidebar
          title="Available (Spare)"
          trucks={availableTrucks}
          variant="available"
          onAddTruck={isManager ? onAddTruck : undefined}
          onTruckClick={isManager ? onTruckClick : undefined}
          onTruckDrop={isManager ? onTruckDropOnAvailable : undefined}
          highlightTruck={truckSearch}
        />
        <RetiredTrucksPanel
          trucks={retiredTrucks}
          onTruckClick={isManager ? onRetiredTruckClick : undefined}
        />
      </div>

      {/* ===== MOBILE LAYOUT ===== */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        {/* Toggle buttons for OOS / Available */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMobileDrawer(mobileDrawer === 'oos' ? null : 'oos')}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
              mobileDrawer === 'oos'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-800'
            }`}
          >
            <ChevronRight size={14} />
            OOS ({outOfServiceTrucks.length})
          </button>
          <div className="flex-1" />
          {retiredTrucks.length > 0 && (
            <button
              onClick={() => setMobileDrawer(mobileDrawer === 'retired' ? null : 'retired')}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
                mobileDrawer === 'retired'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              Ret ({retiredTrucks.length})
            </button>
          )}
          <button
            onClick={() => setMobileDrawer(mobileDrawer === 'available' ? null : 'available')}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
              mobileDrawer === 'available'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-800'
            }`}
          >
            Avail ({availableTrucks.length})
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Belt tabs */}
        <div className="flex bg-gray-200 rounded-lg p-1 mb-3">
          {mobileBelts.map((belt, idx) => (
            <button
              key={belt.id}
              onClick={() => setActiveBeltTab(idx)}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                activeBeltTab === idx
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600'
              }`}
            >
              {belt.letter} Belt
            </button>
          ))}
        </div>

        {/* Belt + inline panel row */}
        <div className="flex-1 flex gap-2 overflow-hidden">
          {/* OOS panel on the left */}
          {mobileDrawer === 'oos' && (
            <MobileTruckPanel
              title="OOS"
              trucks={outOfServiceTrucks}
              variant="out-of-service"
              onClose={() => setMobileDrawer(null)}
              onTruckClick={isManager ? onOutOfServiceTruckClick : undefined}
              highlightTruck={truckSearch}
            />
          )}

          {/* Belt column - shifts based on which panel is open */}
          {mobileBelts[activeBeltTab] && (
            <div className="flex-1 flex justify-center overflow-y-auto pb-4 min-w-[150px]">
              <BeltColumn
                beltId={mobileBelts[activeBeltTab].id}
                beltName={mobileBelts[activeBeltTab].name}
                beltLetter={mobileBelts[activeBeltTab].letter}
                baseNumber={mobileBelts[activeBeltTab].baseNumber}
                spots={mobileBelts[activeBeltTab].spots}
                onSpotClick={(spot) => onBeltSpotClick(spot, mobileBelts[activeBeltTab].id)}
                onSpotDoubleClick={onBeltDoubleClick}
                isManager={isManager}
                isDragEnabled={!!onTruckDropOnSpot}
                onTruckDrop={onTruckDropOnSpot ? (spot, truckNumber) => onTruckDropOnSpot(spot, mobileBelts[activeBeltTab].id, truckNumber) : undefined}
                showTruckInHeader={mobileDrawer !== null}
                highlightTruck={truckSearch}
              />
            </div>
          )}

          {/* Retired panel */}
          {mobileDrawer === 'retired' && (
            <MobileRetiredPanel
              trucks={retiredTrucks}
              onClose={() => setMobileDrawer(null)}
              onTruckClick={isManager ? onRetiredTruckClick : undefined}
            />
          )}

          {/* Available panel on the right */}
          {mobileDrawer === 'available' && (
            <MobileTruckPanel
              title="Available"
              trucks={availableTrucks}
              variant="available"
              onClose={() => setMobileDrawer(null)}
              onAddTruck={isManager ? onAddTruck : undefined}
              onTruckClick={isManager ? onTruckClick : undefined}
              highlightTruck={truckSearch}
            />
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
