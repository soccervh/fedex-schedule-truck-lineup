import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { FacilityView } from '../components/FacilityView';
import { BeltDetailView } from '../components/BeltDetailView';
import { NeedsFillSidebar } from '../components/NeedsFillSidebar';
import { SwingDriversSidebar } from '../components/SwingDriversSidebar';
import { AssignmentModal } from '../components/AssignmentModal';
import type { Belt, BeltSpot, FacilityArea, FacilitySpot, SwingDriver } from '../types/lineup';

export default function FacilityPage() {
  const { isManager } = useAuth();
  const [selectedDate, setSelectedDate] = useQueryState('date', {
    defaultValue: new Date().toISOString().split('T')[0],
  });
  const [detailBeltId, setDetailBeltId] = useState<number | null>(null);
  const [selectedBeltSpot, setSelectedBeltSpot] = useState<{ spot: BeltSpot; beltId: number } | null>(null);

  const { data: beltsData, isLoading: beltsLoading } = useQuery({
    queryKey: ['all-belts', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/belts/all/assignments?date=${selectedDate}`);
      return res.data as Belt[];
    },
  });

  const { data: facilityAreasData, isLoading: facilityLoading } = useQuery({
    queryKey: ['facility-areas', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/facility/areas?date=${selectedDate}`);
      return res.data as Record<string, FacilityArea>;
    },
  });

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
    setSelectedBeltSpot({ spot, beltId });
  };

  const handleFacilitySpotClick = (spot: FacilitySpot) => {
    if (!isManager) return;
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
            ) : facilityAreasData ? (
              <FacilityView
                belts={beltsData}
                facilityAreas={facilityAreasData}
                onBeltSpotClick={handleBeltSpotClick}
                onFacilitySpotClick={handleFacilitySpotClick}
                onBeltDoubleClick={handleBeltDoubleClick}
                isManager={isManager}
              />
            ) : null}
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

      {/* Sidebars - hidden on mobile */}
      {!detailBelt && (
        <div className="hidden md:contents">
          <SwingDriversSidebar
            swingDrivers={swingDriversData || []}
          />
          <NeedsFillSidebar
            coverageNeeds={coverageData?.needsCoverage || []}
            onSpotClick={handleSidebarSpotClick}
          />
        </div>
      )}

      {/* Modal */}
      {selectedBeltSpot && (() => {
        const belt = beltsData?.find(b => b.id === selectedBeltSpot.beltId);
        return (
          <AssignmentModal
            spot={selectedBeltSpot.spot}
            beltId={selectedBeltSpot.beltId}
            beltLetter={belt?.letter}
            baseNumber={belt?.baseNumber}
            date={selectedDate}
            onClose={() => setSelectedBeltSpot(null)}
          />
        );
      })()}
    </div>
  );
}
