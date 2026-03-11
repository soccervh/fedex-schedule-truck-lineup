import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';
import { getAllStartTimes, DEFAULT_CONFIG } from '../utils/startTimes';
import type { StartTimeConfig } from '../utils/startTimes';

interface StartTimesModalProps {
  selectedDate: string;
  initialConfig?: StartTimeConfig;
  onClose: () => void;
}

const AREA_LABELS: Record<string, string> = {
  SORT: 'Sort / Unload / Puller',
  TRUCK_MOVER: 'Truck Mover',
  DOC_SORT: 'Doc Sort',
  DOC_RAMP: 'Doc Ramp',
  FO: 'FO',
  LATE_STARTER: 'Late Starter',
};

export function StartTimesModal({ selectedDate, initialConfig, onClose }: StartTimesModalProps) {
  const queryClient = useQueryClient();
  const config = initialConfig || DEFAULT_CONFIG;

  const [mondaySort, setMondaySort] = useState(config.mondaySort);
  const [tueFriSort, setTueFriSort] = useState(config.tueFriSort);
  const [saturdaySort, setSaturdaySort] = useState(config.saturdaySort);

  const previewConfig: StartTimeConfig = { mondaySort, tueFriSort, saturdaySort };

  // Use fixed reference dates that are known to be Mon/Tue/Sat
  const monPreview = getAllStartTimes('2026-01-05', previewConfig); // a Monday
  const tueFriPreview = getAllStartTimes('2026-01-06', previewConfig); // a Tuesday
  const satPreview = getAllStartTimes('2026-01-10', previewConfig); // a Saturday

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.patch('/facility/start-times', { mondaySort, tueFriSort, saturdaySort });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['start-time-config'] });
      onClose();
    },
  });

  const handleReset = () => {
    setMondaySort(DEFAULT_CONFIG.mondaySort);
    setTueFriSort(DEFAULT_CONFIG.tueFriSort);
    setSaturdaySort(DEFAULT_CONFIG.saturdaySort);
  };

  const hasChanges = mondaySort !== config.mondaySort || tueFriSort !== config.tueFriSort || saturdaySort !== config.saturdaySort;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold dark:text-white">Edit Start Times</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Change the sort time and offset-based areas will adjust automatically.
          </p>

          {/* Editable sort times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Monday Sort</label>
              <input
                type="time"
                value={mondaySort}
                onChange={e => setMondaySort(e.target.value)}
                className="w-full px-2 py-1.5 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Tue-Fri Sort</label>
              <input
                type="time"
                value={tueFriSort}
                onChange={e => setTueFriSort(e.target.value)}
                className="w-full px-2 py-1.5 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Saturday Sort</label>
              <input
                type="time"
                value={saturdaySort}
                onChange={e => setSaturdaySort(e.target.value)}
                className="w-full px-2 py-1.5 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Preview table */}
          <div className="border dark:border-gray-700 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Area</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Mon</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Tue-Fri</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">Sat</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {Object.entries(AREA_LABELS).map(([area, label]) => (
                  <tr key={area}>
                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{label}</td>
                    <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">{monPreview[area] || '—'}</td>
                    <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">{tueFriPreview[area] || '—'}</td>
                    <td className="px-3 py-1.5 text-center text-gray-600 dark:text-gray-400">{satPreview[area] || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
