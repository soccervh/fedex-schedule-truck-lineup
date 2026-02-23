import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X, Truck, ArrowRight, AlertTriangle, Trash2, Pencil, Ban } from 'lucide-react';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';

interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE' | 'RETIRED';
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
      role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
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
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE' | 'RETIRED';
  note?: string;
}

interface TruckAssignmentModalProps {
  spot: BeltSpot;
  beltLetter: string;
  date: string;
  availableTrucks: AvailableTruck[];
  onClose: () => void;
  onEditTruck?: (truckId: number) => void;
}

type ModalStep = 'select' | 'confirm-retire' | 'out-of-service';

export function TruckAssignmentModal({
  spot,
  beltLetter,
  date,
  availableTrucks,
  onClose,
  onEditTruck,
}: TruckAssignmentModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ModalStep>('select');
  const [oosNote, setOosNote] = useState('');

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

  // Mutation to retire truck (soft-delete)
  const retireTruckMutation = useMutation({
    mutationFn: async (truckId: number) => {
      return api.post('/trucks/retire', { truckId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['retired-trucks'] });
      onClose();
    },
  });

  // Mutation to move truck to out of service
  const outOfServiceMutation = useMutation({
    mutationFn: async ({ truckId, note }: { truckId: number; note: string }) => {
      return api.post('/trucks/move-to-out-of-service', { truckId, date, note });
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
    if (step === 'confirm-retire' || step === 'out-of-service') {
      setStep('select');
    } else {
      onClose();
    }
  };

  const spotLabel = `${beltLetter}${spot.number}`;
  const currentTruck = spot.truckAssignment?.truck;
  const isPending = assignTruckMutation.isPending || removeTruckMutation.isPending || retireTruckMutation.isPending || outOfServiceMutation.isPending;

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
            {/* Current Truck Actions */}
            {currentTruck && (
              <div className="space-y-2">
                {onEditTruck && (
                  <button
                    onClick={() => onEditTruck(currentTruck.id)}
                    disabled={isPending}
                    className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Pencil size={24} className="text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-800">Edit Truck {currentTruck.number}</p>
                        <p className="text-sm text-gray-600">Change truck details (type, status, etc.)</p>
                      </div>
                    </div>
                  </button>
                )}
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
                <button
                  onClick={() => { setOosNote(''); setStep('out-of-service'); }}
                  disabled={isPending}
                  className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg text-left hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Ban size={24} className="text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800">Out of Service</p>
                      <p className="text-sm text-gray-600">Mark truck as out of service</p>
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
                      <p className="text-sm text-gray-600">Remove from active fleet</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'confirm-retire' && currentTruck && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <AlertTriangle size={24} />
              <span className="font-semibold">Confirm Retire Truck</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Retire truck {currentTruck.number}?
              </p>
              <p className="text-gray-600 mt-2">
                This will remove the truck from the active fleet.
              </p>
            </div>

            <p className="text-sm text-gray-500 text-center">
              This can be restored later from the Retired Trucks section.
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
                className="flex-1 bg-gray-700 text-white py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {isPending ? 'Retiring...' : 'Yes, Retire Truck'}
              </button>
            </div>
          </div>
        )}

        {step === 'out-of-service' && currentTruck && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Ban size={24} />
              <span className="font-semibold text-lg">Mark Out of Service</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Mark truck {currentTruck.number} as Out of Service?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={oosNote}
                onChange={(e) => setOosNote(e.target.value)}
                placeholder="e.g., Flat tire, Engine issue, Scheduled maintenance..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => outOfServiceMutation.mutate({ truckId: currentTruck.id, note: oosNote })}
                disabled={isPending}
                className="flex-1 bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? 'Updating...' : 'Mark Out of Service'}
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
