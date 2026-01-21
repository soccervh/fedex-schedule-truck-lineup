import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

interface Spot {
  id: number;
  number: number;
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
  date: string;
  onClose: () => void;
}

export function AssignmentModal({ spot, beltId, date, onClose }: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState(
    spot.assignment?.user.id || ''
  );
  const [truckNumber, setTruckNumber] = useState(
    spot.assignment?.truckNumber || ''
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
    mutationFn: async (data: { spotId: number; userId: string; date: string; truckNumber: string }) => {
      return api.post('/assignments', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['belt', beltId, date] });
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
      queryClient.invalidateQueries({ queryKey: ['coverage', date] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !truckNumber) return;

    assignMutation.mutate({
      spotId: spot.id,
      userId: selectedUserId,
      date,
      truckNumber,
    });
  };

  const handleDelete = () => {
    if (spot.assignment) {
      deleteMutation.mutate(spot.assignment.id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            Belt {beltId} - Spot {spot.number}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Truck Number
            </label>
            <input
              type="text"
              value={truckNumber}
              onChange={(e) => setTruckNumber(e.target.value)}
              placeholder="e.g., 123456"
              className="w-full px-3 py-2 border rounded-md"
              required
              minLength={6}
            />
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
  );
}
