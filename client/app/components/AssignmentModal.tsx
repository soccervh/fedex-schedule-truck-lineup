import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { X, Truck } from 'lucide-react';

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

  const { data: spotRoutes } = useQuery({
    queryKey: ['spot-routes', spot.id],
    queryFn: async () => {
      const res = await api.get(`/routes/by-spot/${spot.id}`);
      return res.data;
    },
  });

  const { data: allRoutes } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
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

  const loadLocationMutation = useMutation({
    mutationFn: async ({ routeId, loadLocation }: { routeId: number; loadLocation: string | null }) => {
      return api.patch(`/routes/${routeId}/load-location`, { loadLocation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-routes', spot.id] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });

  const assignRouteMutation = useMutation({
    mutationFn: async ({ routeId, spotId }: { routeId: number; spotId: number }) => {
      return api.put('/routes/assign-to-spot', { routeId, spotId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-routes', spot.id] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
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
          {/* Route Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
              <select
                value={spotRoutes?.[0]?.id || ''}
                onChange={(e) => {
                  const routeId = parseInt(e.target.value);
                  if (!routeId) return;
                  const selected = allRoutes?.find((r: any) => r.id === routeId);
                  if (selected?.beltSpotId && selected.beltSpotId !== spot.id) {
                    if (!confirm(`Route ${selected.number} is already assigned to another spot. Move it here?`)) {
                      return;
                    }
                  }
                  assignRouteMutation.mutate({ routeId, spotId: spot.id });
                }}
                className="w-full px-2 py-1.5 border rounded text-sm"
                disabled={assignRouteMutation.isPending}
              >
                <option value="">No route assigned</option>
                {allRoutes?.map((route: any) => (
                  <option key={route.id} value={route.id}>
                    R:{route.number}{route.beltSpotId && route.beltSpotId !== spot.id ? ' (on another spot)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {spotRoutes?.[0] && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Area</label>
                <select
                  value={spotRoutes[0].loadLocation || ''}
                  onChange={(e) => loadLocationMutation.mutate({
                    routeId: spotRoutes[0].id,
                    loadLocation: e.target.value || null,
                  })}
                  className="w-full px-2 py-1.5 border rounded text-sm"
                  disabled={loadLocationMutation.isPending}
                >
                  <option value="">No Area</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  <option value="DOC">Doc</option>
                  <option value="UNLOAD">Unload</option>
                  <option value="LABEL_FACER">Label Facer</option>
                  <option value="SCANNER">Scanner</option>
                  <option value="SPLITTER">Splitter</option>
                  <option value="FO">FO</option>
                  <option value="PULLER">Puller</option>
                </select>
              </div>
            )}
          </div>

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
              >
                <option value="">No person assigned</option>
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
                disabled={assignMutation.isPending || !selectedUserId}
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Saving...' : selectedUserId ? 'Assign Person' : 'Select a person to assign'}
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
