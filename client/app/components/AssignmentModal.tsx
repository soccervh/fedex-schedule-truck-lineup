import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { api } from '../lib/api';
import { X, Truck, Check, AlertTriangle } from 'lucide-react';

interface Spot {
  id: number;
  number: number;
  routeOverride?: number | null;
  assignment: {
    id: string;
    truckNumber: string;
    duration?: string;
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
  const [duration, setDuration] = useState<string>(spot.assignment?.duration || 'TODAY');
  const [routeSaved, setRouteSaved] = useState(false);
  const [areaSaved, setAreaSaved] = useState(false);
  const [pullerSaved, setPullerSaved] = useState(false);
  const [personSaved, setPersonSaved] = useState(false);

  const { data: people } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  const { data: swingDrivers } = useQuery({
    queryKey: ['swing-drivers', date],
    queryFn: async () => {
      const res = await api.get(`/people/swing?date=${date}`);
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
    mutationFn: async (data: { spotId: number; userId: string; date: string; duration: string }) => {
      return api.post('/assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      queryClient.invalidateQueries({ queryKey: ['coverage'] });
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      setPersonSaved(true);
      setTimeout(() => setPersonSaved(false), 2000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      return api.delete(`/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      queryClient.invalidateQueries({ queryKey: ['coverage'] });
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      setSelectedUserId('');
      setPersonSaved(true);
      setTimeout(() => setPersonSaved(false), 2000);
    },
  });

  const loadLocationMutation = useMutation({
    mutationFn: async ({ routeId, loadLocation }: { routeId: number; loadLocation: string | null }) => {
      return api.patch(`/routes/${routeId}/load-location`, { loadLocation });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-routes', spot.id] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      setAreaSaved(true);
      setTimeout(() => setAreaSaved(false), 2000);
    },
  });

  const isPuller = spotRoutes?.[0]?.loadLocation === 'PULLER';

  const { data: pulledRoutes } = useQuery({
    queryKey: ['pulled-routes', spot.id],
    queryFn: async () => {
      const res = await api.get(`/routes/pulled-by/${spot.id}`);
      return res.data;
    },
    enabled: isPuller,
  });

  const pullerMutation = useMutation({
    mutationFn: async ({ routeId, pullerBeltSpotId }: { routeId: number; pullerBeltSpotId: number | null }) => {
      return api.patch(`/routes/${routeId}/puller-spot`, { pullerBeltSpotId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulled-routes', spot.id] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      setPullerSaved(true);
      setTimeout(() => setPullerSaved(false), 2000);
    },
  });

  const assignRouteMutation = useMutation({
    mutationFn: async ({ routeId, spotId }: { routeId: number; spotId: number }) => {
      return api.put('/routes/assign-to-spot', { routeId, spotId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spot-routes', spot.id] });
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      setRouteSaved(true);
      setTimeout(() => setRouteSaved(false), 2000);
    },
  });

  const markSickMutation = useMutation({
    mutationFn: async ({ userId, date }: { userId: string; date: string }) => {
      return api.post('/timeoff/mark-sick', { userId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      queryClient.invalidateQueries({ queryKey: ['coverage'] });
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas'] });
      onClose();
    },
  });

  const handleMarkSick = () => {
    if (!spot.assignment) return;
    if (!confirm(`Mark ${spot.assignment.user.name} as sick for today?`)) return;
    markSickMutation.mutate({ userId: spot.assignment.user.id, date });
  };

  const autoSaveAssignment = (userId: string, dur: string) => {
    if (!userId) {
      if (spot.assignment) {
        deleteMutation.mutate(spot.assignment.id);
      }
      return;
    }
    assignMutation.mutate({
      spotId: spot.id,
      userId,
      date,
      duration: dur,
    });
  };

  const handlePersonChange = (userId: string) => {
    setSelectedUserId(userId);
    autoSaveAssignment(userId, duration);
  };

  const handleDurationChange = (dur: string) => {
    setDuration(dur);
    if (selectedUserId) {
      autoSaveAssignment(selectedUserId, dur);
    }
  };

  const handleSwapTruck = () => {
    const params = new URLSearchParams({ date, spotId: String(spot.id), beltId: String(beltId) });
    navigate(`/truck-lineup?${params.toString()}`);
  };

  const spotLabel = beltLetter ? `${beltLetter}${spot.number}` : `Spot ${spot.number}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-600">
          <h2 className="text-lg font-semibold dark:text-white">
            {spotLabel}
          </h2>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Route & Area Section - saves automatically */}
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Route & Area</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">Changes save automatically</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Route
                {routeSaved && <span className="ml-2 text-green-600 text-xs inline-flex items-center gap-0.5"><Check size={12} /> Saved</span>}
              </label>
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
                className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-500 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Assign Area
                  {areaSaved && <span className="ml-2 text-green-600 text-xs inline-flex items-center gap-0.5"><Check size={12} /> Saved</span>}
                </label>
                <select
                  value={spotRoutes[0].loadLocation || ''}
                  onChange={(e) => loadLocationMutation.mutate({
                    routeId: spotRoutes[0].id,
                    loadLocation: e.target.value || null,
                  })}
                  className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-500 dark:text-white"
                  disabled={loadLocationMutation.isPending}
                >
                  <option value="">No Area</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  <option value="DOC">Doc</option>
                  <option value="UNLOAD">Unload</option>
                  <option value="SORT">Sort</option>
                  <option value="FO">FO</option>
                  <option value="PULLER">Puller</option>
                  <option value="LATE_STARTER">Late Starter</option>
                </select>
              </div>
            )}
          </div>

          {/* Puller Routes Section */}
          {isPuller && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-yellow-700 uppercase">Routes Pulled</span>
                {pullerSaved && <span className="text-green-600 text-xs inline-flex items-center gap-0.5"><Check size={12} /> Saved</span>}
              </div>
              {pulledRoutes && pulledRoutes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pulledRoutes.map((r: any) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-xs font-medium"
                    >
                      R:{r.number}
                      <button
                        type="button"
                        onClick={() => pullerMutation.mutate({ routeId: r.id, pullerBeltSpotId: null })}
                        className="text-yellow-600 hover:text-red-600 ml-0.5"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <select
                value=""
                onChange={(e) => {
                  const routeId = parseInt(e.target.value);
                  if (routeId) {
                    pullerMutation.mutate({ routeId, pullerBeltSpotId: spot.id });
                  }
                }}
                className="w-full px-2 py-1.5 border rounded text-sm dark:bg-gray-700 dark:border-gray-500 dark:text-white"
                disabled={pullerMutation.isPending}
              >
                <option value="">Add route to pull...</option>
                {allRoutes
                  ?.filter((r: any) => r.isActive && r.id !== spotRoutes?.[0]?.id && !pulledRoutes?.some((pr: any) => pr.id === r.id))
                  .sort((a: any, b: any) => {
                    const aSameBelt = a.beltSpot?.belt?.letter === beltLetter ? 0 : 1;
                    const bSameBelt = b.beltSpot?.belt?.letter === beltLetter ? 0 : 1;
                    if (aSameBelt !== bSameBelt) return aSameBelt - bSameBelt;
                    if (aSameBelt === 0 && bSameBelt === 0) {
                      const aDist = Math.abs((a.beltSpot?.number || 0) - spot.number);
                      const bDist = Math.abs((b.beltSpot?.number || 0) - spot.number);
                      return aDist - bDist;
                    }
                    return 0;
                  })
                  .map((r: any) => (
                    <option key={r.id} value={r.id}>
                      R:{r.number}{r.beltSpot ? ` (${r.beltSpot.belt.letter}${r.beltSpot.number})` : ''}{r.pullerBeltSpotId && r.pullerBeltSpotId !== spot.id ? ' - other puller' : ''}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Mark Sick Button */}
          {spot.assignment && !spot.assignment.needsCoverage && (
            <button
              type="button"
              onClick={handleMarkSick}
              disabled={markSickMutation.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 border border-red-300 text-red-800 rounded-md hover:bg-red-100 transition-colors"
            >
              <AlertTriangle size={16} />
              {markSickMutation.isPending ? 'Marking...' : 'Mark Sick'}
            </button>
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

          {/* Person Assignment Section - auto-saves */}
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Person Assignment</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {personSaved ? <span className="text-green-600 inline-flex items-center gap-0.5"><Check size={12} /> Saved</span> : 'Changes save automatically'}
              </span>
            </div>

            {spot.assignment?.needsCoverage && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded p-3 text-sm dark:text-red-200">
                <strong>{spot.assignment.user.name}</strong> is off. Select a swing driver for coverage.
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {spot.assignment?.needsCoverage ? 'Swing Driver' : 'Assign Person'}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => handlePersonChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
                disabled={assignMutation.isPending || deleteMutation.isPending}
              >
                <option value="">No person assigned</option>
                {spot.assignment?.needsCoverage ? (
                  swingDrivers
                    ?.slice()
                    .sort((a: any, b: any) => (a.assignedSpot ? 1 : 0) - (b.assignedSpot ? 1 : 0))
                    .map((driver: any) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}{driver.assignedSpot ? ` (covering ${driver.assignedSpot})` : ''}
                    </option>
                  ))
                ) : (
                  people?.map((person: any) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {selectedUserId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                <div className="flex gap-1">
                  {[
                    { value: 'TODAY', label: 'Today' },
                    { value: 'WEEK', label: 'This Week' },
                    { value: 'UNTIL_FILLED', label: 'Until Route Assigned' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleDurationChange(opt.value)}
                      disabled={assignMutation.isPending}
                      className={`flex-1 px-2 py-1.5 text-xs rounded-md border transition-colors ${
                        duration === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Done Button */}
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
