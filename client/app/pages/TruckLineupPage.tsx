import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { TruckLineupView } from '../components/TruckLineupView';
import { BeltDetailView } from '../components/BeltDetailView';
import { TruckModal } from '../components/TruckModal';
import { TruckAssignmentModal } from '../components/TruckAssignmentModal';
import { OutOfServiceTruckModal } from '../components/OutOfServiceTruckModal';
import { BeltWalkAuditModal } from '../components/BeltWalkAuditModal';
import type { Belt, BeltSpot, Truck } from '../types/lineup';

export default function TruckLineupPage() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useQueryState('date', {
    defaultValue: new Date().toISOString().split('T')[0],
  });
  const [deepLinkSpotId, setDeepLinkSpotId] = useQueryState('spotId');
  const [deepLinkBeltId, setDeepLinkBeltId] = useQueryState('beltId');
  const [detailBeltId, setDetailBeltId] = useState<number | null>(null);
  const [truckModalOpen, setTruckModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [truckAssignmentSpot, setTruckAssignmentSpot] = useState<{ spot: BeltSpot; beltLetter: string } | null>(null);
  const [outOfServiceTruck, setOutOfServiceTruck] = useState<Truck | null>(null);
  const [walkBeltOpen, setWalkBeltOpen] = useState(false);

  const { data: beltsData, isLoading } = useQuery({
    queryKey: ['all-belts', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/belts/all/assignments?date=${selectedDate}`);
      return res.data as Belt[];
    },
  });

  const { data: trucksData } = useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      const res = await api.get('/trucks');
      return res.data as Truck[];
    },
  });

  // Handle deep-link from AssignmentModal "Swap Truck" button
  useEffect(() => {
    if (!deepLinkSpotId || !deepLinkBeltId || !beltsData) return;

    const beltId = parseInt(deepLinkBeltId);
    const spotId = parseInt(deepLinkSpotId);
    const belt = beltsData.find(b => b.id === beltId);
    const spot = belt?.spots.find(s => s.id === spotId);

    if (belt && spot) {
      setTruckAssignmentSpot({ spot, beltLetter: belt.letter });
    }

    // Clear deep-link params
    setDeepLinkSpotId(null);
    setDeepLinkBeltId(null);
  }, [deepLinkSpotId, deepLinkBeltId, beltsData]);

  const handleTruckLineupSpotClick = (spot: BeltSpot, beltId: number) => {
    if (!isManager) return;
    const belt = beltsData?.find(b => b.id === beltId);
    if (belt) {
      setTruckAssignmentSpot({ spot, beltLetter: belt.letter });
    }
  };

  const handleBeltDoubleClick = (beltId: number) => {
    setDetailBeltId(beltId);
  };

  const handleBackToLineup = () => {
    setDetailBeltId(null);
  };

  const handleAddTruck = () => {
    setSelectedTruck(null);
    setTruckModalOpen(true);
  };

  const handleTruckClick = (truck: Truck) => {
    setSelectedTruck(truck);
    setTruckModalOpen(true);
  };

  const handleOutOfServiceTruckClick = (truck: Truck) => {
    setOutOfServiceTruck(truck);
  };

  const handleEditOutOfServiceTruck = () => {
    if (outOfServiceTruck) {
      setSelectedTruck(outOfServiceTruck);
      setTruckModalOpen(true);
      setOutOfServiceTruck(null);
    }
  };

  const handleCloseTruckModal = () => {
    setTruckModalOpen(false);
    setSelectedTruck(null);
  };

  const assignTruckToSpotMutation = useMutation({
    mutationFn: async ({ truckId, spotId }: { truckId: number; spotId: number }) => {
      return api.post('/trucks/spot-assignments', { truckId, spotId, date: selectedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });

  const [pendingDrop, setPendingDrop] = useState<{
    spot: BeltSpot;
    beltLetter: string;
    truckNumber: string;
    isOutOfService: boolean;
    truckId: number;
    existingTruckNumber?: string;
  } | null>(null);

  const [oosNoteModal, setOosNoteModal] = useState<{
    truckNumber: string;
    truckId: number;
    note: string;
  } | null>(null);

  const handleTruckDropOnSpot = (spot: BeltSpot, beltId: number, truckNumber: string) => {
    const truck = trucksData?.find(t => t.number === truckNumber);
    const belt = beltsData?.find(b => b.id === beltId);

    if (!truck) return;

    const existingTruck = spot.truckAssignment?.truck;

    if (existingTruck?.number === truckNumber) return;

    if (truck.status === 'OUT_OF_SERVICE' || existingTruck) {
      setPendingDrop({
        spot,
        beltLetter: belt?.letter || '',
        truckNumber,
        isOutOfService: truck.status === 'OUT_OF_SERVICE',
        truckId: truck.id,
        existingTruckNumber: existingTruck?.number,
      });
    } else {
      assignTruckToSpotMutation.mutate({
        truckId: truck.id,
        spotId: spot.id,
      });
    }
  };

  const handleTruckDropOnAvailable = (truckNumber: string) => {
    const truck = trucksData?.find(t => t.number === truckNumber);
    if (!truck) return;
    if (truck.status === 'AVAILABLE') return;
    moveToAvailableMutation.mutate({ truckId: truck.id });
  };

  const handleTruckDropOnOutOfService = (truckNumber: string) => {
    const truck = trucksData?.find(t => t.number === truckNumber);
    if (!truck) return;
    if (truck.status === 'OUT_OF_SERVICE') return;
    setOosNoteModal({
      truckNumber,
      truckId: truck.id,
      note: '',
    });
  };

  const moveToAvailableMutation = useMutation({
    mutationFn: async ({ truckId }: { truckId: number }) => {
      return api.post('/trucks/move-to-available', { truckId, date: selectedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });

  const moveToOutOfServiceMutation = useMutation({
    mutationFn: async ({ truckId, note }: { truckId: number; note: string }) => {
      await api.post('/trucks/move-to-out-of-service', { truckId, date: selectedDate, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      setOosNoteModal(null);
    },
  });

  const handleConfirmOutOfService = () => {
    if (!oosNoteModal) return;
    moveToOutOfServiceMutation.mutate({
      truckId: oosNoteModal.truckId,
      note: oosNoteModal.note,
    });
  };

  const handleConfirmDrop = async () => {
    if (!pendingDrop) return;

    try {
      await assignTruckToSpotMutation.mutateAsync({
        truckId: pendingDrop.truckId,
        spotId: pendingDrop.spot.id,
      });
    } catch (error) {
      console.error('Failed to assign truck:', error);
    }
    setPendingDrop(null);
  };

  const detailBelt = detailBeltId ? beltsData?.find((b) => b.id === detailBeltId) : null;

  const availableTrucks = trucksData?.filter(t => t.status === 'AVAILABLE') || [];
  const outOfServiceTrucks = trucksData?.filter(t => t.status === 'OUT_OF_SERVICE') || [];

  return (
    <div className="flex h-[calc(100vh-120px)]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">
              {detailBelt ? detailBelt.name : 'Truck Lineup'}
            </h1>
            {isManager && !detailBelt && (
              <button
                onClick={() => setWalkBeltOpen(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                Walk Belt
              </button>
            )}
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading...
          </div>
        ) : beltsData ? (
          <div className="flex-1 overflow-hidden bg-white rounded-lg shadow p-4">
            {detailBelt ? (
              <BeltDetailView
                beltName={detailBelt.name}
                beltLetter={detailBelt.letter}
                baseNumber={detailBelt.baseNumber}
                spots={detailBelt.spots}
                onSpotClick={(spot) => handleTruckLineupSpotClick(spot, detailBelt.id)}
                onBack={handleBackToLineup}
                isManager={isManager}
              />
            ) : (
              <TruckLineupView
                belts={beltsData}
                availableTrucks={availableTrucks}
                outOfServiceTrucks={outOfServiceTrucks}
                onBeltSpotClick={handleTruckLineupSpotClick}
                onBeltDoubleClick={handleBeltDoubleClick}
                isManager={isManager}
                onAddTruck={handleAddTruck}
                onTruckClick={handleTruckClick}
                onOutOfServiceTruckClick={handleOutOfServiceTruckClick}
                onTruckDropOnSpot={isManager ? handleTruckDropOnSpot : undefined}
                onTruckDropOnAvailable={isManager ? handleTruckDropOnAvailable : undefined}
                onTruckDropOnOutOfService={isManager ? handleTruckDropOnOutOfService : undefined}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No data available
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 text-sm mt-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-fo"></div>
            <span>FO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
            <span>Doc</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-unload"></div>
            <span>Unload</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-puller"></div>
            <span>Puller</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-swing"></div>
            <span>Swing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-400 border-2 border-red-600"></div>
            <span>Needs Fill</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {truckModalOpen && (
        <TruckModal
          truck={selectedTruck || undefined}
          onClose={handleCloseTruckModal}
        />
      )}

      {truckAssignmentSpot && (
        <TruckAssignmentModal
          spot={truckAssignmentSpot.spot}
          beltLetter={truckAssignmentSpot.beltLetter}
          date={selectedDate}
          availableTrucks={availableTrucks}
          onClose={() => setTruckAssignmentSpot(null)}
        />
      )}

      {outOfServiceTruck && beltsData && (
        <OutOfServiceTruckModal
          truck={outOfServiceTruck}
          allBelts={beltsData}
          date={selectedDate}
          onClose={() => setOutOfServiceTruck(null)}
          onEditTruck={handleEditOutOfServiceTruck}
        />
      )}

      {/* Confirmation dialog for switching trucks or assigning out-of-service trucks */}
      {pendingDrop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold text-lg">
                {pendingDrop.existingTruckNumber ? 'Switch Trucks' : 'Confirm Truck Assignment'}
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center mb-4">
              {pendingDrop.isOutOfService && (
                <>
                  <p className="text-lg font-semibold text-gray-800">
                    Is truck {pendingDrop.truckNumber} ready to drive?
                  </p>
                  <p className="text-gray-600 mt-2">
                    This truck was marked as Out of Service.
                  </p>
                </>
              )}
              {pendingDrop.existingTruckNumber && (
                <>
                  <p className="text-lg font-semibold text-gray-800">
                    Switch truck {pendingDrop.existingTruckNumber} with {pendingDrop.truckNumber}?
                  </p>
                  <p className="text-gray-600 mt-2">
                    Truck {pendingDrop.existingTruckNumber} will be moved to Available (Spare).
                  </p>
                </>
              )}
              {!pendingDrop.isOutOfService && !pendingDrop.existingTruckNumber && (
                <p className="text-lg font-semibold text-gray-800">
                  Assign truck {pendingDrop.truckNumber}?
                </p>
              )}
              <p className="text-gray-600 mt-2">
                Will be assigned to <strong>{pendingDrop.beltLetter}{pendingDrop.spot.number}</strong>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPendingDrop(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDrop}
                disabled={assignTruckToSpotMutation.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {assignTruckToSpotMutation.isPending ? 'Assigning...' : (pendingDrop.isOutOfService ? "Yes, It's Ready" : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out of Service note modal */}
      {oosNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold text-lg">Mark Out of Service</span>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center mb-4">
              <p className="text-lg font-semibold text-gray-800">
                Mark truck {oosNoteModal.truckNumber} as Out of Service?
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <textarea
                value={oosNoteModal.note}
                onChange={(e) => setOosNoteModal({ ...oosNoteModal, note: e.target.value })}
                placeholder="e.g., Flat tire, Engine issue, Scheduled maintenance..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOosNoteModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOutOfService}
                disabled={moveToOutOfServiceMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {moveToOutOfServiceMutation.isPending ? 'Updating...' : 'Mark Out of Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {walkBeltOpen && beltsData && (
        <BeltWalkAuditModal
          belts={beltsData}
          date={selectedDate}
          onClose={() => setWalkBeltOpen(false)}
        />
      )}
    </div>
  );
}
