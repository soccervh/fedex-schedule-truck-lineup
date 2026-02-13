import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

interface RouteData {
  id?: number;
  number: string;
  assignedArea: 'EO_POOL' | 'UNLOAD' | 'DOCK' | 'BELT_SPOT';
  beltSpotId?: number | null;
}

interface RouteModalProps {
  route?: RouteData;
  onClose: () => void;
}

export function RouteModal({ route, onClose }: RouteModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!route?.id;

  const [formData, setFormData] = useState({
    number: route?.number || '',
    assignedArea: route?.assignedArea || 'EO_POOL' as const,
    beltSpotId: route?.beltSpotId || null as number | null,
  });

  const { data: belts } = useQuery({
    queryKey: ['belts-for-routes'],
    queryFn: async () => {
      const res = await api.get('/belts');
      return res.data;
    },
    enabled: formData.assignedArea === 'BELT_SPOT',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/routes', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.put(`/routes/${route?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
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

  // Build belt spot options from belts data
  const beltSpotOptions: { id: number; label: string }[] = [];
  if (belts) {
    for (const belt of belts) {
      for (const spot of belt.spots || []) {
        beltSpotOptions.push({
          id: spot.id,
          label: `Belt ${belt.letter} - Spot ${spot.number}`,
        });
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Route' : 'Add Route'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route Number
            </label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g. 101"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assigned Area
            </label>
            <select
              value={formData.assignedArea}
              onChange={(e) => setFormData({
                ...formData,
                assignedArea: e.target.value as any,
                beltSpotId: e.target.value !== 'BELT_SPOT' ? null : formData.beltSpotId,
              })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="EO_POOL">EO Pool</option>
              <option value="UNLOAD">Unload</option>
              <option value="DOCK">Dock</option>
              <option value="BELT_SPOT">Belt Spot</option>
            </select>
          </div>

          {formData.assignedArea === 'BELT_SPOT' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Belt Spot
              </label>
              <select
                value={formData.beltSpotId || ''}
                onChange={(e) => setFormData({ ...formData, beltSpotId: parseInt(e.target.value) || null })}
                className="w-full px-3 py-2 border rounded-md"
                required
              >
                <option value="">Select a spot...</option>
                {beltSpotOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Route' : 'Add Route'}
          </button>
        </form>
      </div>
    </div>
  );
}
