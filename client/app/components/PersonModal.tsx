import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';

interface Person {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
  homeArea: 'FO' | 'DOC' | 'UNLOAD' | 'PULLER' | 'UNASSIGNED';
}

interface PersonModalProps {
  person?: Person;
  onClose: () => void;
}

export function PersonModal({ person, onClose }: PersonModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!person?.id;

  const [formData, setFormData] = useState({
    name: person?.name || '',
    email: person?.email || '',
    phone: person?.phone || '',
    password: '',
    role: person?.role || 'DRIVER',
    homeArea: person?.homeArea || 'UNASSIGNED',
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return api.post('/people', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<typeof formData>) => {
      return api.put(`/people/${person?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      const { password, email, ...updateData } = formData;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Person' : 'Add Person'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
              required
            />
          </div>

          {!isEditing && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="DRIVER">Driver</option>
                <option value="SWING">Swing Driver</option>
                <option value="MANAGER">Manager</option>
                <option value="CSA">CSA</option>
                <option value="HANDLER">Handler</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Role
              </label>
              <select
                value={formData.homeArea}
                onChange={(e) => setFormData({ ...formData, homeArea: e.target.value as any })}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="UNASSIGNED">Unassigned</option>
                <option value="FO">FO</option>
                <option value="DOC">Doc</option>
                <option value="UNLOAD">Unload</option>
                <option value="PULLER">Puller</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update Person' : 'Add Person'}
          </button>
        </form>
      </div>
    </div>
  );
}
