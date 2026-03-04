import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X, Pencil, Ban, Trash2, AlertTriangle, MapPin, Home } from 'lucide-react';
import type { Truck, Belt } from '../types/lineup';

interface AvailableTruckModalProps {
  truck: Truck;
  allBelts?: Belt[];
  date: string;
  onClose: () => void;
  onEditTruck: () => void;
}

type ModalStep = 'select' | 'confirm-retire' | 'out-of-service' | 'pick-spot' | 'confirm-spot' | 'confirm-home-spot';

export function AvailableTruckModal({
  truck,
  allBelts,
  date,
  onClose,
  onEditTruck,
}: AvailableTruckModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<ModalStep>('select');
  const [oosNote, setOosNote] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<{
    id: number;
    beltLetter: string;
    spotNumber: number;
  } | null>(null);

  const outOfServiceMutation = useMutation({
    mutationFn: async ({ truckId, note }: { truckId: number; note: string }) => {
      return api.post('/trucks/move-to-out-of-service', { truckId, date, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      onClose();
    },
  });

  const retireMutation = useMutation({
    mutationFn: async (truckId: number) => {
      return api.post('/trucks/retire', { truckId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      queryClient.invalidateQueries({ queryKey: ['retired-trucks'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      onClose();
    },
  });

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

  // Build spot list from belts data
  const allSpots: Array<{
    id: number;
    beltLetter: string;
    spotNumber: number;
    hasTruck: boolean;
    currentTruck?: string;
  }> = [];

  allBelts?.forEach((belt) => {
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

  allSpots.sort((a, b) => {
    if (a.beltLetter !== b.beltLetter) return a.beltLetter.localeCompare(b.beltLetter);
    return a.spotNumber - b.spotNumber;
  });

  // Home spot info
  const homeSpotLabel = truck.homeSpot
    ? `${truck.homeSpot.belt.letter}${truck.homeSpot.number}`
    : null;

  const homeSpotOccupant = truck.homeSpot
    ? allSpots.find(s => s.id === truck.homeSpot!.id)
    : null;

  const isPending = outOfServiceMutation.isPending || retireMutation.isPending || assignToSpotMutation.isPending;

  const handleCancel = () => {
    if (step === 'confirm-retire' || step === 'out-of-service' || step === 'pick-spot' || step === 'confirm-spot' || step === 'confirm-home-spot') {
      setStep('select');
      setSelectedSpot(null);
    } else {
      onClose();
    }
  };

  const handleSendToHomeSpot = () => {
    if (!truck.homeSpot) return;
    if (homeSpotOccupant?.hasTruck) {
      setStep('confirm-home-spot');
    } else {
      assignToSpotMutation.mutate({ spotId: truck.homeSpot.id });
    }
  };

  const handleSelectSpot = (spot: typeof allSpots[0]) => {
    setSelectedSpot({
      id: spot.id,
      beltLetter: spot.beltLetter,
      spotNumber: spot.spotNumber,
    });
    setStep('confirm-spot');
  };

  const handleConfirmSpot = () => {
    if (!selectedSpot) return;
    assignToSpotMutation.mutate({ spotId: selectedSpot.id });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Truck {truck.number}</h2>
            <p className="text-sm text-green-600">Available (Spare)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {step === 'select' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Send to Home Spot */}
              {truck.homeSpot && allBelts && (
                <button
                  onClick={handleSendToHomeSpot}
                  className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Home size={24} className="text-blue-600" />
                    <div>
                      <p className="font-semibold text-blue-800">
                        Send to Home Spot ({homeSpotLabel})
                      </p>
                      <p className="text-sm text-gray-600">
                        Assign truck to its designated spot
                        {homeSpotOccupant?.hasTruck && (
                          <span className="text-amber-600 ml-1">
                            (currently has {homeSpotOccupant.currentTruck})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* Assign to Spot */}
              {allBelts && (
                <button
                  onClick={() => setStep('pick-spot')}
                  className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-left hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <MapPin size={24} className="text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Assign to Spot</p>
                      <p className="text-sm text-gray-600">Pick a belt spot for this truck</p>
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={onEditTruck}
                className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Pencil size={24} className="text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">Edit Truck {truck.number}</p>
                    <p className="text-sm text-gray-600">Change truck details (type, home spot, etc.)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setOosNote(''); setStep('out-of-service'); }}
                className="w-full p-4 bg-amber-50 border border-amber-200 rounded-lg text-left hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Ban size={24} className="text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">Mark Out of Service</p>
                    <p className="text-sm text-gray-600">Move truck to out of service</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setStep('confirm-retire')}
                className="w-full p-4 bg-gray-100 border border-gray-300 rounded-lg text-left hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={24} className="text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-800">Retire Truck {truck.number}</p>
                    <p className="text-sm text-gray-600">Remove from active fleet</p>
                  </div>
                </div>
              </button>
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

        {step === 'pick-spot' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 mb-2">Select a spot for truck {truck.number}:</h3>
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
            <div className="p-4 border-t">
              <button
                onClick={handleCancel}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </>
        )}

        {step === 'confirm-spot' && selectedSpot && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <MapPin size={24} />
              <span className="font-semibold text-lg">Confirm Assignment</span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Assign truck {truck.number} to {selectedSpot.beltLetter}{selectedSpot.spotNumber}?
              </p>
              {allSpots.find(s => s.id === selectedSpot.id)?.hasTruck && (
                <p className="text-amber-600 mt-2">
                  Truck {allSpots.find(s => s.id === selectedSpot.id)?.currentTruck} will be moved to Available.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSpot}
                disabled={isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Assigning...' : 'Yes, Assign'}
              </button>
            </div>
          </div>
        )}

        {step === 'confirm-home-spot' && truck.homeSpot && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertTriangle size={24} />
              <span className="font-semibold text-lg">Spot Occupied</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                {homeSpotLabel} already has truck {homeSpotOccupant?.currentTruck}.
              </p>
              <p className="text-gray-600 mt-2">
                Replace it and move {homeSpotOccupant?.currentTruck} to Available?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => assignToSpotMutation.mutate({ spotId: truck.homeSpot!.id })}
                disabled={isPending}
                className="flex-1 bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? 'Assigning...' : 'Yes, Swap Trucks'}
              </button>
            </div>
          </div>
        )}

        {step === 'out-of-service' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <Ban size={24} />
              <span className="font-semibold text-lg">Mark Out of Service</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Mark truck {truck.number} as Out of Service?
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
                onClick={() => outOfServiceMutation.mutate({ truckId: truck.id, note: oosNote })}
                disabled={isPending}
                className="flex-1 bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 disabled:opacity-50"
              >
                {isPending ? 'Updating...' : 'Mark Out of Service'}
              </button>
            </div>
          </div>
        )}

        {step === 'confirm-retire' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <AlertTriangle size={24} />
              <span className="font-semibold">Confirm Retire Truck</span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold text-gray-800">
                Retire truck {truck.number}?
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
                onClick={() => retireMutation.mutate(truck.id)}
                disabled={isPending}
                className="flex-1 bg-gray-700 text-white py-2 rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {isPending ? 'Retiring...' : 'Yes, Retire Truck'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
