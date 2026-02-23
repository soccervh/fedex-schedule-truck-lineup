import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';
import type { TruckType } from '../types/lineup';
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

interface TruckModalProps {
  truck?: Truck;
  onClose: () => void;
}

export function TruckModal({ truck, onClose }: TruckModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!truck?.id;

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
      onClose();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Build spot options from all belts
  const spotOptions: { id: number; label: string }[] = [];
  beltsData?.forEach((belt) => {
    belt.spots?.forEach((spot) => {
      spotOptions.push({
        id: spot.id,
        label: `${belt.letter}${spot.number}`,
      });
    });
  });
  // Sort by label
  spotOptions.sort((a, b) => a.label.localeCompare(b.label));

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
