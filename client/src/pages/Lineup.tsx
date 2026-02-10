import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FacilityView } from '../components/FacilityView';
import { BeltDetailView } from '../components/BeltDetailView';
import { NeedsFillSidebar } from '../components/NeedsFillSidebar';
import { AssignmentModal } from '../components/AssignmentModal';

type HomeArea = 'FO' | 'DOCK' | 'UNLOAD' | 'PULLER';

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

export function Lineup() {
  const { isManager } = useAuth();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [detailBeltId, setDetailBeltId] = useState<number | null>(null);
  const [selectedBeltSpot, setSelectedBeltSpot] = useState<{ spot: BeltSpot; beltId: number } | null>(null);

  // Fetch all belts with assignments
  const { data: beltsData, isLoading: beltsLoading } = useQuery({
    queryKey: ['all-belts', selectedDate],
    queryFn: async () => {
      const beltsRes = await api.get('/belts');
      const belts = beltsRes.data;

      // Fetch assignments for each belt
      const beltsWithAssignments = await Promise.all(
        belts.map(async (belt: Belt) => {
          const assignmentsRes = await api.get(
            `/belts/${belt.id}/assignments?date=${selectedDate}`
          );
          return {
            ...belt,
            letter: assignmentsRes.data.letter,
            baseNumber: assignmentsRes.data.baseNumber,
            spots: assignmentsRes.data.spots,
          };
        })
      );

      return beltsWithAssignments as Belt[];
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

  const { data: coverageData } = useQuery({
    queryKey: ['coverage', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/timeoff/coverage-needs?date=${selectedDate}`);
      return res.data;
    },
  });

  const handleBeltSpotClick = (spot: BeltSpot, beltId: number) => {
    if (!isManager) return;
    setSelectedBeltSpot({ spot, beltId });
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

  const detailBelt = detailBeltId ? beltsData?.find((b) => b.id === detailBeltId) : null;
  const isLoading = beltsLoading || facilityLoading;

  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">
            {detailBelt ? detailBelt.name : 'Facility View'}
          </h1>
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
        ) : beltsData && facilityAreasData ? (
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
            ) : (
              <FacilityView
                belts={beltsData}
                facilityAreas={facilityAreasData}
                onBeltSpotClick={handleBeltSpotClick}
                onFacilitySpotClick={handleFacilitySpotClick}
                onBeltDoubleClick={handleBeltDoubleClick}
                isManager={isManager}
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
            <div className="w-4 h-4 rounded bg-dock"></div>
            <span>Dock</span>
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

      {/* Sidebar */}
      <NeedsFillSidebar
        coverageNeeds={coverageData?.needsCoverage || []}
        onSpotClick={handleSidebarSpotClick}
      />

      {/* Modal */}
      {selectedBeltSpot && (
        <AssignmentModal
          spot={selectedBeltSpot.spot}
          beltId={selectedBeltSpot.beltId}
          date={selectedDate}
          onClose={() => setSelectedBeltSpot(null)}
        />
      )}
    </div>
  );
}
