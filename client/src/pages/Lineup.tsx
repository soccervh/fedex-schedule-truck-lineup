import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { BeltSelector } from '../components/BeltSelector';
import { SpotGrid } from '../components/SpotGrid';

export function Lineup() {
  const { isManager } = useAuth();
  const [selectedBelt, setSelectedBelt] = useState(1);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const { data: beltData, isLoading } = useQuery({
    queryKey: ['belt', selectedBelt, selectedDate],
    queryFn: async () => {
      const res = await api.get(
        `/belts/${selectedBelt}/assignments?date=${selectedDate}`
      );
      return res.data;
    },
  });

  const { data: coverageData } = useQuery({
    queryKey: ['coverage', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/timeoff/coverage-needs?date=${selectedDate}`);
      return res.data;
    },
  });

  const handleSpotClick = (spot: any) => {
    if (!isManager) return;
    // TODO: Open assignment modal
    console.log('Clicked spot:', spot);
  };

  const needsCoverageCount = coverageData?.needsCoverage?.length || 0;
  const availableSwingCount = coverageData?.availableSwing?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BeltSelector selectedBelt={selectedBelt} onSelect={setSelectedBelt} />
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
      </div>

      {needsCoverageCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <span className="font-medium text-red-800">
            {needsCoverageCount} spot{needsCoverageCount !== 1 ? 's' : ''} need
            coverage
          </span>
          <span className="text-red-600 ml-2">
            — {availableSwingCount} swing driver
            {availableSwingCount !== 1 ? 's' : ''} available
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : beltData ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">{beltData.name}</h2>
          <SpotGrid
            spots={beltData.spots}
            onSpotClick={handleSpotClick}
            isManager={isManager}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">No data available</div>
      )}

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-belt"></div>
          <span>Belt</span>
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
          <div className="w-4 h-4 rounded bg-swing"></div>
          <span>Swing</span>
        </div>
      </div>
    </div>
  );
}
