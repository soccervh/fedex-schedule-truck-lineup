import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FacilityView } from '../components/FacilityView';
import { TruckLineupView } from '../components/TruckLineupView';
import { BeltDetailView } from '../components/BeltDetailView';
import { NeedsFillSidebar } from '../components/NeedsFillSidebar';
import { SwingDriversSidebar } from '../components/SwingDriversSidebar';
import { AssignmentModal } from '../components/AssignmentModal';
import { TruckModal } from '../components/TruckModal';
import { TruckAssignmentModal } from '../components/TruckAssignmentModal';
import { OutOfServiceTruckModal } from '../components/OutOfServiceTruckModal';

type HomeArea = 'FO' | 'DOC' | 'UNLOAD' | 'PULLER';
type ViewTab = 'facility' | 'truck-lineup';

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

interface FacilitySpot {
  id: number;
  number: number;
  label?: string;
  side?: string;
  assignment: {
    id: string;
    user: {
      id: string;
      name: string;
      homeArea: HomeArea;
      role: 'DRIVER' | 'SWING' | 'MANAGER';
    };
    needsCoverage?: boolean;
    originalUserHomeArea?: HomeArea;
  } | null;
}

interface FacilityArea {
  name: string;
  subArea: string | null;
  spots: FacilitySpot[];
}

interface Truck {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  note?: string;
  homeSpotId?: number | null;
  homeSpot?: {
    id: number;
    number: number;
    belt: {
      id: number;
      letter: string;
    };
  };
}

interface SwingDriver {
  id: string;
  name: string;
  homeArea: HomeArea;
}

export function Lineup() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ViewTab>('facility');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [detailBeltId, setDetailBeltId] = useState<number | null>(null);
  const [selectedBeltSpot, setSelectedBeltSpot] = useState<{ spot: BeltSpot; beltId: number } | null>(null);
  const [truckModalOpen, setTruckModalOpen] = useState(false);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [truckAssignmentSpot, setTruckAssignmentSpot] = useState<{ spot: BeltSpot; beltLetter: string } | null>(null);
  const [outOfServiceTruck, setOutOfServiceTruck] = useState<Truck | null>(null);

  // Fetch all belts with assignments in a single request
  const { data: beltsData, isLoading: beltsLoading } = useQuery({
    queryKey: ['all-belts', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/belts/all/assignments?date=${selectedDate}`);
      return res.data as Belt[];
    },
  });

  // Fetch facility areas with assignments
  const { data: facilityAreasData, isLoading: facilityLoading } = useQuery({
    queryKey: ['facility-areas', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/facility/areas?date=${selectedDate}`);
      return res.data as Record<string, FacilityArea>;
    },
  });

  // Fetch trucks
  const { data: trucksData } = useQuery({
    queryKey: ['trucks'],
    queryFn: async () => {
      const res = await api.get('/trucks');
      return res.data as Truck[];
    },
  });

  // Fetch swing drivers
  const { data: swingDriversData } = useQuery({
    queryKey: ['swing-drivers'],
    queryFn: async () => {
      const res = await api.get('/people/swing');
      return res.data as SwingDriver[];
    },
  });

  const { data: coverageData } = useQuery({
    queryKey: ['coverage', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/timeoff/coverage-needs?date=${selectedDate}`);
      return res.data;
    },
  });

  const handleBeltSpotClick = (spot: BeltSpot, beltId: number) => {
    if (!isManager) return;
    // In facility view, use the regular assignment modal
    setSelectedBeltSpot({ spot, beltId });
  };

  const handleTruckLineupSpotClick = (spot: BeltSpot, beltId: number) => {
    if (!isManager) return;
    // In truck lineup view, use the truck assignment modal
    const belt = beltsData?.find(b => b.id === beltId);
    if (belt) {
      setTruckAssignmentSpot({ spot, beltLetter: belt.letter });
    }
  };

  const handleFacilitySpotClick = (spot: FacilitySpot) => {
    if (!isManager) return;
    // TODO: Implement facility spot modal
    console.log('Facility spot clicked:', spot);
  };

  const handleBeltDoubleClick = (beltId: number) => {
    setDetailBeltId(beltId);
  };

  const handleBackToFacility = () => {
    setDetailBeltId(null);
  };

  const handleSidebarSpotClick = (spotId: number, beltId: number) => {
    const belt = beltsData?.find((b) => b.id === beltId);
    const spot = belt?.spots.find((s) => s.id === spotId);
    if (spot && belt) {
      setSelectedBeltSpot({ spot, beltId: belt.id });
    }
  };

  const handleAddTruck = () => {
    setSelectedTruck(null);
    setTruckModalOpen(true);
  };

  const handleTruckClick = (truck: Truck) => {
    // For available trucks, open the edit modal
    setSelectedTruck(truck);
    setTruckModalOpen(true);
  };

  const handleOutOfServiceTruckClick = (truck: Truck) => {
    // For out-of-service trucks, open the special modal
    setOutOfServiceTruck(truck);
  };

  const handleCloseTruckModal = () => {
    setTruckModalOpen(false);
    setSelectedTruck(null);
  };

  // Mutation to assign truck to spot (using independent truck spot assignments)
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

  // State for Out of Service note modal
  const [oosNoteModal, setOosNoteModal] = useState<{
    truckNumber: string;
    truckId: number;
    note: string;
  } | null>(null);

  const handleTruckDropOnSpot = (spot: BeltSpot, beltId: number, truckNumber: string) => {
    // Find the truck to check if it's out of service
    const truck = trucksData?.find(t => t.number === truckNumber);
    const belt = beltsData?.find(b => b.id === beltId);

    if (!truck) return;

    // Check if spot already has a truck assigned
    const existingTruck = spot.truckAssignment?.truck;

    // If dropping on same truck, do nothing
    if (existingTruck?.number === truckNumber) return;

    if (truck.status === 'OUT_OF_SERVICE' || existingTruck) {
      // Show confirmation for out-of-service trucks OR when switching trucks
      setPendingDrop({
        spot,
        beltLetter: belt?.letter || '',
        truckNumber,
        isOutOfService: truck.status === 'OUT_OF_SERVICE',
        truckId: truck.id,
        existingTruckNumber: existingTruck?.number,
      });
    } else {
      // Assign directly for available trucks to empty spots
      assignTruckToSpotMutation.mutate({
        truckId: truck.id,
        spotId: spot.id,
      });
    }
  };

  // Handler for dropping truck on Available sidebar
  const handleTruckDropOnAvailable = (truckNumber: string) => {
    const truck = trucksData?.find(t => t.number === truckNumber);
    if (!truck) return;

    // Skip if already available
    if (truck.status === 'AVAILABLE') return;

    // Move truck to available
    moveToAvailableMutation.mutate({ truckId: truck.id });
  };

  // Handler for dropping truck on Out of Service sidebar
  const handleTruckDropOnOutOfService = (truckNumber: string) => {
    const truck = trucksData?.find(t => t.number === truckNumber);
    if (!truck) return;

    // Skip if already out of service
    if (truck.status === 'OUT_OF_SERVICE') return;

    // Show note modal
    setOosNoteModal({
      truckNumber,
      truckId: truck.id,
      note: '',
    });
  };

  // Mutation to move truck to available
  const moveToAvailableMutation = useMutation({
    mutationFn: async ({ truckId }: { truckId: number }) => {
      return api.post('/trucks/move-to-available', { truckId, date: selectedDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });

  // Mutation to move truck to out of service
  const moveToOutOfServiceMutation = useMutation({
    mutationFn: async ({ truckId, note }: { truckId: number; note: string }) => {
      // First remove any spot assignment for this date
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
  const isLoading = beltsLoading || facilityLoading;

  // Filter trucks by status
  const availableTrucks = trucksData?.filter(t => t.status === 'AVAILABLE') || [];
  const outOfServiceTrucks = trucksData?.filter(t => t.status === 'OUT_OF_SERVICE') || [];

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              {detailBelt ? detailBelt.name : (activeTab === 'facility' ? 'Facility View' : 'Truck Lineup')}
            </h1>

            {/* Tab buttons */}
            {!detailBelt && (
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('facility')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'facility'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Facility View
                </button>
                <button
                  onClick={() => setActiveTab('truck-lineup')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'truck-lineup'
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Truck Lineup
                </button>
              </div>
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
                onSpotClick={(spot) => handleBeltSpotClick(spot, detailBelt.id)}
                onBack={handleBackToFacility}
                isManager={isManager}
              />
            ) : activeTab === 'facility' && facilityAreasData ? (
              <FacilityView
                belts={beltsData}
                facilityAreas={facilityAreasData}
                onBeltSpotClick={handleBeltSpotClick}
                onFacilitySpotClick={handleFacilitySpotClick}
                onBeltDoubleClick={handleBeltDoubleClick}
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

      {/* Sidebars - only show on facility view */}
      {activeTab === 'facility' && !detailBelt && (
        <>
          <SwingDriversSidebar
            swingDrivers={swingDriversData || []}
          />
          <NeedsFillSidebar
            coverageNeeds={coverageData?.needsCoverage || []}
            onSpotClick={handleSidebarSpotClick}
          />
        </>
      )}

      {/* Modals */}
      {selectedBeltSpot && (
        <AssignmentModal
          spot={selectedBeltSpot.spot}
          beltId={selectedBeltSpot.beltId}
          date={selectedDate}
          onClose={() => setSelectedBeltSpot(null)}
        />
      )}

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
    </div>
  );
}
