import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

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
      role: string;
    };
    needsCoverage?: boolean;
  } | null;
}

interface RouteAssignment {
  id: number;
  number: string;
  facilitySpotId: number | null;
  driver: { id: string; name: string } | null;
  driverIsOff: boolean;
}

interface FacilityAssignmentModalProps {
  spot: FacilitySpot;
  sectionName: string;
  routes: RouteAssignment[];
  onClose: () => void;
}

function formatName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export function FacilityAssignmentModal({ spot, sectionName, routes, onClose }: FacilityAssignmentModalProps) {
  const queryClient = useQueryClient();
  const spotLabel = spot.label || `${sectionName === 'UNLOAD' ? 'U' : sectionName === 'FO' ? 'FO' : ''}${spot.number}`;
  const sideLabel = spot.side ? ` (${spot.side})` : '';

  // Local optimistic state: track which routes are assigned to this spot
  const [localRoutes, setLocalRoutes] = useState(routes);

  const assignedRoutes = localRoutes.filter(r => r.facilitySpotId === spot.id);
  const availableRoutes = localRoutes.filter(r => r.facilitySpotId !== spot.id);

  const mutation = useMutation({
    mutationFn: async ({ routeId, facilitySpotId }: { routeId: number; facilitySpotId: number | null }) => {
      const res = await api.post('/facility/assign-route-spot', { routeId, facilitySpotId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
    },
  });

  const handleAssign = (routeId: number) => {
    setLocalRoutes(prev => prev.map(r => r.id === routeId ? { ...r, facilitySpotId: spot.id } : r));
    mutation.mutate({ routeId, facilitySpotId: spot.id });
  };

  const handleRemove = (routeId: number) => {
    setLocalRoutes(prev => prev.map(r => r.id === routeId ? { ...r, facilitySpotId: null } : r));
    mutation.mutate({ routeId, facilitySpotId: null });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-600">
          <h2 className="text-lg font-semibold dark:text-white">
            {spotLabel}{sideLabel}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Routes assigned to this spot */}
          {assignedRoutes.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Routes at this spot</div>
              <div className="space-y-2">
                {assignedRoutes.map(route => (
                  <div key={route.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md px-3 py-2">
                    <div>
                      <span className="text-xs font-bold bg-green-600 text-white rounded px-1.5 py-0.5 mr-2">
                        R:{route.number}
                      </span>
                      <span className={`text-sm ${route.driverIsOff ? 'text-red-600 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                        {route.driver ? formatName(route.driver.name) : '—'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(route.id)}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available routes to assign */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assign Route</div>
            {availableRoutes.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No more routes available</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {availableRoutes.map(route => {
                  const atOtherSpot = route.facilitySpotId != null;
                  return (
                    <button
                      key={route.id}
                      onClick={() => handleAssign(route.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md border border-gray-200 dark:border-gray-600 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                    >
                      <div>
                        <span className="text-xs font-bold bg-gray-500 text-white rounded px-1.5 py-0.5 mr-2">
                          R:{route.number}
                        </span>
                        <span className={`text-sm ${route.driverIsOff ? 'text-red-600 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                          {route.driver ? formatName(route.driver.name) : '—'}
                        </span>
                        {atOtherSpot && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">(assigned elsewhere)</span>
                        )}
                      </div>
                      <span className="text-xs text-blue-600 font-medium">Assign</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-600">
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
