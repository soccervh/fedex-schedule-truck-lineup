import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';
import type { TruckType, Belt as FullBelt } from '../types/lineup';
import { TRUCK_TYPE_LABELS } from '../types/lineup';

interface Truck {
  id?: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
  truckType?: TruckType;
  homeSpotId?: number | null;
  note?: string;
  homeSpot?: {
    id: number;
    number: number;
    belt: {
      id: number;
      letter: string;
    };
  };
}

interface Belt {
  id: number;
  letter: string;
  spots: { id: number; number: number }[];
}

type ModalPhase = 'form' | 'confirm-assign' | 'confirm-replace';

interface TruckModalProps {
  truck?: Truck;
  date?: string;
  assignmentBeltsData?: FullBelt[];
  onClose: () => void;
}

export function TruckModal({ truck, date, assignmentBeltsData, onClose }: TruckModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!truck?.id;

  const [phase, setPhase] = useState<ModalPhase>('form');
  const [createdTruck, setCreatedTruck] = useState<{ id: number; number: string } | null>(null);
  const [occupyingTruckNumber, setOccupyingTruckNumber] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: truck?.number || '',
    status: truck?.status || 'AVAILABLE',
    truckType: truck?.truckType || 'UNKNOWN',
    homeSpotId: truck?.homeSpotId?.toString() || '',
    note: truck?.note || '',
  });

  // Fetch belts for home spot selection
  const { data: beltsData } = useQuery({
    queryKey: ['belts-for-select'],
    queryFn: async () => {
      const res = await api.get('/belts');
      return res.data as Belt[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/trucks', {
        ...data,
        homeSpotId: data.homeSpotId || null,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });

      const newTruck = response.data;

      // If creating with a home spot and we have date context, offer to assign
      if (!isEditing && formData.homeSpotId && date) {
        setCreatedTruck({ id: newTruck.id, number: newTruck.number || formData.number });
        setPhase('confirm-assign');
      } else {
        onClose();
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { status: _status, ...rest } = data;
      return api.patch(`/trucks/${truck?.id}`, {
        ...rest,
        homeSpotId: data.homeSpotId || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onClose();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ truckId, spotId }: { truckId: number; spotId: number }) => {
      return api.post('/trucks/spot-assignments', { truckId, spotId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleConfirmAssign = () => {
    if (!createdTruck || !formData.homeSpotId) return;

    const spotId = parseInt(formData.homeSpotId);

    // Check if the spot is currently occupied using the assignment belts data
    let existingTruckNumber: string | undefined;
    if (assignmentBeltsData) {
      for (const belt of assignmentBeltsData) {
        for (const spot of belt.spots) {
          if (spot.id === spotId && spot.truckAssignment?.truck) {
            existingTruckNumber = spot.truckAssignment.truck.number;
            break;
          }
        }
        if (existingTruckNumber) break;
      }
    }

    if (existingTruckNumber) {
      setOccupyingTruckNumber(existingTruckNumber);
      setPhase('confirm-replace');
    } else {
      assignMutation.mutate({ truckId: createdTruck.id, spotId });
    }
  };

  const handleConfirmReplace = () => {
    if (!createdTruck || !formData.homeSpotId) return;
    assignMutation.mutate({ truckId: createdTruck.id, spotId: parseInt(formData.homeSpotId) });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Build spot options from all belts
  const spotOptions: { id: number; label: string; letter: string; number: number }[] = [];
  beltsData?.forEach((belt) => {
    belt.spots?.forEach((spot) => {
      spotOptions.push({
        id: spot.id,
        label: `${belt.letter}${spot.number}`,
        letter: belt.letter,
        number: spot.number,
      });
    });
  });
  // Sort by belt letter then spot number numerically
  spotOptions.sort((a, b) => {
    if (a.letter !== b.letter) return a.letter.localeCompare(b.letter);
    return a.number - b.number;
  });

  // Get the spot label for confirmations
  const selectedSpotLabel = spotOptions.find(s => s.id === parseInt(formData.homeSpotId))?.label || '';

  // Confirmation: assign to spot?
  if (phase === 'confirm-assign' && createdTruck) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
            <span className="font-semibold text-lg">Assign to Spot?</span>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center mb-4">
            <p className="text-lg font-semibold text-gray-800">
              Assign truck {createdTruck.number} to spot {selectedSpotLabel}?
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              No
            </button>
            <button
              onClick={handleConfirmAssign}
              disabled={assignMutation.isPending}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Assigning...' : 'Yes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation: replace existing truck?
  if (phase === 'confirm-replace' && createdTruck && occupyingTruckNumber) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-semibold text-lg">Spot Occupied</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center mb-4">
            <p className="text-lg font-semibold text-gray-800">
              Spot {selectedSpotLabel} already has truck {occupyingTruckNumber}.
            </p>
            <p className="text-gray-600 mt-2">
              Replace it and move {occupyingTruckNumber} to Available?
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReplace}
              disabled={assignMutation.isPending}
              className="flex-1 bg-amber-600 text-white py-2 rounded-md hover:bg-amber-700 disabled:opacity-50"
            >
              {assignMutation.isPending ? 'Replacing...' : 'Yes, Replace'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Truck' : 'Add Truck'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Truck Number
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., T101"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Truck Type
            </label>
            <select
              value={formData.truckType}
              onChange={(e) => setFormData({ ...formData, truckType: e.target.value as TruckType })}
              className="w-full px-3 py-2 border rounded-md"
            >
              {Object.entries(TRUCK_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Home Spot (Optional)
            </label>
            <select
              value={formData.homeSpotId}
              onChange={(e) => setFormData({ ...formData, homeSpotId: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">No home spot</option>
              {spotOptions.map((spot) => (
                <option key={spot.id} value={spot.id}>
                  {spot.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              rows={2}
              placeholder="e.g., Engine repair needed"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Truck' : 'Add Truck'}
          </button>
        </form>
      </div>
    </div>
  );
}
