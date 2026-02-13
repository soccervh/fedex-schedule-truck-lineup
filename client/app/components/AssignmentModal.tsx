import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { X, Truck } from 'lucide-react';
import { calculateRouteNumber, getEffectiveRouteNumber } from '../utils/belt';

interface Spot {
  id: number;
  number: number;
  routeOverride?: number | null;
  assignment: {
    id: string;
    truckNumber: string;
    user: {
      id: string;
      name: string;
    };
    needsCoverage: boolean;
  } | null;
}

interface AssignmentModalProps {
  spot: Spot;
  beltId: number;
  beltLetter?: string;
  baseNumber?: number;
  date: string;
  onClose: () => void;
}

export function AssignmentModal({ spot, beltId, beltLetter, baseNumber, date, onClose }: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(
    spot.assignment?.user.id || ''
  );

  const defaultRoute = baseNumber != null ? calculateRouteNumber(baseNumber, spot.number) : null;
  const effectiveRoute = baseNumber != null ? getEffectiveRouteNumber(baseNumber, spot.number, spot.routeOverride) : null;
  const [routeOverrideInput, setRouteOverrideInput] = useState(
    spot.routeOverride != null ? String(spot.routeOverride) : ''
  );

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  const { data: swingDrivers } = useQuery({
    queryKey: ['swing-drivers'],
    queryFn: async () => {
      const res = await api.get('/people/swing');
      return res.data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { spotId: number; userId: string; date: string }) => {
      return api.post('/assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['coverage', date] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return api.delete(`/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['coverage', date] });
      onClose();
    },
  });

  const routeOverrideMutation = useMutation({
    mutationFn: async (data: { routeOverride: number | null }) => {
      return api.patch(`/spots/${spot.id}/route-override`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    assignMutation.mutate({
      spotId: spot.id,
      userId: selectedUserId,
      date,
    });
  };

  const handleDelete = () => {
    if (spot.assignment) {
      deleteMutation.mutate(spot.assignment.id);
    }
  };

  const handleSaveRouteOverride = () => {
    const val = routeOverrideInput.trim();
    if (!val) return;
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    routeOverrideMutation.mutate({ routeOverride: num });
  };

  const handleResetRouteOverride = () => {
    setRouteOverrideInput('');
    routeOverrideMutation.mutate({ routeOverride: null });
  };

  const handleSwapTruck = () => {
    const params = new URLSearchParams({ date, spotId: String(spot.id), beltId: String(beltId) });
    navigate(`/truck-lineup?${params.toString()}`);
  };

  const spotLabel = beltLetter ? `${beltLetter}${spot.number}` : `Spot ${spot.number}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {spotLabel}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Route Override Section */}
          {baseNumber != null && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Route Number</span>
                <span className="text-sm text-gray-500">
                  Default: {defaultRoute}
                  {spot.routeOverride != null && (
                    <span className="ml-2 text-blue-600 font-medium">
                      Current: {effectiveRoute}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={routeOverrideInput}
                  onChange={(e) => setRouteOverrideInput(e.target.value)}
                  placeholder={String(defaultRoute)}
                  className="flex-1 px-3 py-1.5 border rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleSaveRouteOverride}
                  disabled={routeOverrideMutation.isPending || !routeOverrideInput.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                {spot.routeOverride != null && (
                  <button
                    type="button"
                    onClick={handleResetRouteOverride}
                    disabled={routeOverrideMutation.isPending}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-100"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Swap Truck Button */}
          <button
            type="button"
            onClick={handleSwapTruck}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border border-amber-300 text-amber-800 rounded-md hover:bg-amber-100 transition-colors"
          >
            <Truck size={16} />
            Change Truck
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            {spot.assignment?.needsCoverage && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                <strong>{spot.assignment.user.name}</strong> is off. Select a
                swing driver for coverage.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {spot.assignment?.needsCoverage ? 'Swing Driver' : 'Assign Person'}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select person...</option>
                {spot.assignment?.needsCoverage ? (
                  swingDrivers?.map((driver: any) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.homeArea})
                    </option>
                  ))
                ) : (
                  people?.map((person: any) => (
                    <option key={person.id} value={person.id}>
                      {person.name} ({person.homeArea})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={assignMutation.isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Saving...' : 'Save Assignment'}
              </button>
              {spot.assignment && !spot.assignment.needsCoverage && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
                >
                  Remove
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
