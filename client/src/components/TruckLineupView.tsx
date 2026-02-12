import { BeltColumn } from './BeltColumn';
import { Plus } from 'lucide-react';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';

interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
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
  onBeltSpotClick: (spot: BeltSpot, beltId: number) => void;
  onBeltDoubleClick: (beltId: number) => void;
  isManager: boolean;
  onAddTruck?: () => void;
  onTruckClick?: (truck: TruckData) => void;
  onOutOfServiceTruckClick?: (truck: TruckData) => void;
  onTruckDropOnSpot?: (spot: BeltSpot, beltId: number, truckNumber: string) => void;
  onTruckDropOnAvailable?: (truckNumber: string) => void;
  onTruckDropOnOutOfService?: (truckNumber: string) => void;
}

import { useState } from 'react';

function TruckSidebar({
  title,
  trucks,
  variant,
  onAddTruck,
  onTruckClick,
  onTruckDrop,
}: {
  title: string;
  trucks: TruckData[];
  variant: 'available' | 'out-of-service';
  onAddTruck?: () => void;
  onTruckClick?: (truck: TruckData) => void;
  onTruckDrop?: (truckNumber: string) => void;
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
          trucks.map((truck) => (
            <div
              key={truck.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', truck.number);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => onTruckClick?.(truck)}
              className={`${badgeColor} rounded p-2 text-sm cursor-grab active:cursor-grabbing ${onTruckClick ? 'hover:opacity-80' : ''}`}
            >
              <div className="font-semibold">{truck.number}</div>
              {truck.note && (
                <div className="text-xs opacity-75 mt-1">{truck.note}</div>
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
  onBeltSpotClick,
  onBeltDoubleClick,
  isManager,
  onAddTruck,
  onTruckClick,
  onOutOfServiceTruckClick,
  onTruckDropOnSpot,
  onTruckDropOnAvailable,
  onTruckDropOnOutOfService,
}: TruckLineupViewProps) {
  // Order belts: D, C, B, A (left to right)
  const orderedBelts = [...belts].sort((a, b) => b.baseNumber - a.baseNumber);

  return (
    <div className="flex h-full gap-4">
      {/* Left sidebar - Out of Service */}
      <TruckSidebar
        title="Out of Service"
        trucks={outOfServiceTrucks}
        variant="out-of-service"
        onTruckClick={isManager ? onOutOfServiceTruckClick : undefined}
        onTruckDrop={isManager ? onTruckDropOnOutOfService : undefined}
      />

      {/* Main content - Belts */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
            />
          ))}
        </div>

        <div className="text-center text-sm text-gray-500 mt-2">EAST</div>
      </div>

      {/* Right sidebar - Available/Spare */}
      <TruckSidebar
        title="Available (Spare)"
        trucks={availableTrucks}
        variant="available"
        onAddTruck={isManager ? onAddTruck : undefined}
        onTruckClick={isManager ? onTruckClick : undefined}
        onTruckDrop={isManager ? onTruckDropOnAvailable : undefined}
      />
    </div>
  );
}
