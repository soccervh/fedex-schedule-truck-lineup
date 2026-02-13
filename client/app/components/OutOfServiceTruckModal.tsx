import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X, AlertTriangle, CheckCircle, Truck } from 'lucide-react';

interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
}

interface BeltSpot {
  id: number;
  number: number;
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

interface OutOfServiceTruckModalProps {
  truck: TruckData;
  allBelts: Belt[];
  date: string;
  onClose: () => void;
}

type ModalStep = 'select' | 'confirm-available' | 'confirm-spot';

export function OutOfServiceTruckModal({
  truck,
  allBelts,
  date,
  onClose,
}: OutOfServiceTruckModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ModalStep>('select');
  const [selectedSpot, setSelectedSpot] = useState<{
    id: number;
    beltLetter: string;
    spotNumber: number;
  } | null>(null);

  // Mutation to move truck to available
  const moveToAvailableMutation = useMutation({
    mutationFn: async () => {
      return api.post('/trucks/move-to-available', { truckId: truck.id, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      onClose();
    },
  });

  // Mutation to assign truck to spot
  const assignToSpotMutation = useMutation({
    mutationFn: async ({ spotId }: { spotId: number }) => {
      return api.post('/trucks/spot-assignments', { truckId: truck.id, spotId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      onClose();
    },
  });

  // Get all spots (for assigning directly to a spot)
  const allSpots: Array<{
    id: number;
    beltLetter: string;
    spotNumber: number;
    hasTruck: boolean;
    currentTruck?: string;
  }> = [];

  allBelts.forEach((belt) => {
    belt.spots.forEach((s) => {
      allSpots.push({
        id: s.id,
        beltLetter: belt.letter,
        spotNumber: s.number,
        hasTruck: !!s.truckAssignment,
        currentTruck: s.truckAssignment?.truck.number,
      });
    });
  });

  // Sort by belt letter then spot number
  allSpots.sort((a, b) => {
    if (a.beltLetter !== b.beltLetter) {
      return a.beltLetter.localeCompare(b.beltLetter);
    }
    return a.spotNumber - b.spotNumber;
  });

  const handleMoveToAvailable = () => {
    setStep('confirm-available');
  };

  const handleSelectSpot = (spot: typeof allSpots[0]) => {
    setSelectedSpot({
      id: spot.id,
      beltLetter: spot.beltLetter,
      spotNumber: spot.spotNumber,
    });
    setStep('confirm-spot');
  };

  const handleConfirmAvailable = () => {
    moveToAvailableMutation.mutate();
  };

  const handleConfirmSpot = () => {
    if (!selectedSpot) return;
    assignToSpotMutation.mutate({ spotId: selectedSpot.id });
  };

  const handleBack = () => {
    setStep('select');
    setSelectedSpot(null);
  };

  const isPending = moveToAvailableMutation.isPending || assignToSpotMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Truck size={20} className="text-red-600" />
              {truck.number} - Out of Service
            </h2>
            {truck.note && (
              <p className="text-sm text-red-600 mt-1">Issue: {truck.note}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {step === 'select' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Move to Available */}
              <button
                onClick={handleMoveToAvailable}
                className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle size={24} className="text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Move to Available (Spare)</p>
                    <p className="text-sm text-gray-600">Mark truck as fixed and available for use</p>
                  </div>
                </div>
              </button>

              {/* Assign to Spot */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Or assign directly to a spot:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allSpots.map((spot) => (
                    <button
                      key={spot.id}
                      onClick={() => handleSelectSpot(spot)}
                      className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-800">
                          {spot.beltLetter}{spot.spotNumber}
                        </span>
                        {spot.hasTruck && (
                          <span className="text-xs text-gray-500">
                            Has: {spot.currentTruck}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {step === 'confirm-available' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertTriangle size={24} />
              <span className="font-semibold">Confirm Truck Status</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Is truck {truck.number} ready to drive?
              </p>
              {truck.note && (
                <p className="text-sm text-red-600 mt-2">
                  Previous issue: {truck.note}
                </p>
              )}
            </div>

            <p className="text-sm text-gray-500 text-center">
              This will mark the truck as available for assignment.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                No, Go Back
              </button>
              <button
                onClick={handleConfirmAvailable}
                disabled={isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? 'Updating...' : 'Yes, It\'s Ready'}
              </button>
            </div>
          </div>
        )}

        {step === 'confirm-spot' && selectedSpot && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertTriangle size={24} />
              <span className="font-semibold">Confirm Truck Assignment</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Is truck {truck.number} ready to drive?
              </p>
              {truck.note && (
                <p className="text-sm text-red-600 mt-2">
                  Previous issue: {truck.note}
                </p>
              )}
              <p className="text-gray-600 mt-3">
                Will be assigned to <strong>{selectedSpot.beltLetter}{selectedSpot.spotNumber}</strong>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                No, Go Back
              </button>
              <button
                onClick={handleConfirmSpot}
                disabled={isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? 'Assigning...' : 'Yes, Assign It'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
