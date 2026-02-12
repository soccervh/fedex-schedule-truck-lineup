import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X, Truck, ArrowRight, AlertTriangle, Trash2 } from 'lucide-react';

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
  } | null;
  truckAssignment?: {
    id: string;
    truck: TruckData;
  } | null;
}

interface AvailableTruck {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
}

interface TruckAssignmentModalProps {
  spot: BeltSpot;
  beltLetter: string;
  date: string;
  availableTrucks: AvailableTruck[];
  onClose: () => void;
}

type ModalStep = 'select' | 'confirm-retire';

export function TruckAssignmentModal({
  spot,
  beltLetter,
  date,
  availableTrucks,
  onClose,
}: TruckAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ModalStep>('select');

  // Mutation to assign truck to spot
  const assignTruckMutation = useMutation({
    mutationFn: async ({ truckId, spotId }: { truckId: number; spotId: number }) => {
      return api.post('/trucks/spot-assignments', { truckId, spotId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onClose();
    },
  });

  // Mutation to remove truck from spot
  const removeTruckMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return api.delete(`/trucks/spot-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onClose();
    },
  });

  // Mutation to retire (delete) truck permanently
  const retireTruckMutation = useMutation({
    mutationFn: async (truckId: number) => {
      return api.delete(`/trucks/${truckId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onClose();
    },
  });

  const handleSelectSpare = (truck: AvailableTruck) => {
    // Spare trucks can be assigned directly without confirmation
    assignTruckMutation.mutate({
      truckId: truck.id,
      spotId: spot.id,
    });
  };

  const handleRemoveTruck = () => {
    if (spot.truckAssignment) {
      removeTruckMutation.mutate(spot.truckAssignment.id);
    }
  };

  const handleRetireTruck = () => {
    setStep('confirm-retire');
  };

  const handleConfirmRetire = () => {
    if (currentTruck) {
      retireTruckMutation.mutate(currentTruck.id);
    }
  };

  const handleCancel = () => {
    if (step === 'confirm-retire') {
      setStep('select');
    } else {
      onClose();
    }
  };

  const spotLabel = `${beltLetter}${spot.number}`;
  const currentTruck = spot.truckAssignment?.truck;
  const isPending = assignTruckMutation.isPending || removeTruckMutation.isPending || retireTruckMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Assign Truck to {spotLabel}</h2>
            {spot.assignment && (
              <p className="text-sm text-gray-600">Driver: {spot.assignment.user.name}</p>
            )}
            {currentTruck && (
              <p className="text-sm text-green-600">Current truck: {currentTruck.number}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {step === 'select' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Remove Current Truck */}
            {currentTruck && (
              <div>
                <button
                  onClick={handleRemoveTruck}
                  disabled={isPending}
                  className="w-full p-4 bg-red-50 border border-red-200 rounded-lg text-left hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <X size={24} className="text-red-600" />
                    <div>
                      <p className="font-semibold text-red-800">Remove Truck {currentTruck.number}</p>
                      <p className="text-sm text-gray-600">Move truck back to available pool</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* Available Spare Trucks */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Truck size={18} className="text-green-600" />
                Available Spare Trucks
              </h3>
              {availableTrucks.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No spare trucks available</p>
              ) : (
                <div className="space-y-2">
                  {availableTrucks.map((truck) => (
                    <button
                      key={truck.id}
                      onClick={() => handleSelectSpare(truck)}
                      disabled={isPending}
                      className="w-full p-3 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100 transition-colors flex items-center justify-between disabled:opacity-50"
                    >
                      <div>
                        <span className="font-semibold text-green-800">{truck.number}</span>
                        {truck.note && (
                          <span className="ml-2 text-xs text-gray-500">({truck.note})</span>
                        )}
                      </div>
                      <ArrowRight size={16} className="text-green-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Retire Truck */}
            {currentTruck && (
              <div>
                <button
                  onClick={handleRetireTruck}
                  disabled={isPending}
                  className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg text-left hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={24} className="text-gray-600" />
                    <div>
                      <p className="font-semibold text-gray-800">Retire Truck {currentTruck.number}</p>
                      <p className="text-sm text-gray-600">Permanently remove from system</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'confirm-retire' && currentTruck && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-600">
              <AlertTriangle size={24} />
              <span className="font-semibold">Confirm Retire Truck</span>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Permanently retire truck {currentTruck.number}?
              </p>
              <p className="text-gray-600 mt-2">
                This will remove the truck from the system entirely.
              </p>
            </div>

            <p className="text-sm text-red-600 text-center font-medium">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRetire}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Retiring...' : 'Yes, Retire Truck'}
              </button>
            </div>
          </div>
        )}

        {step === 'select' && (
          <div className="p-4 border-t">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
