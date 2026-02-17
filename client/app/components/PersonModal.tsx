import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';
import type { AccessLevel } from '../contexts/AuthContext';

interface Person {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
  homeArea?: string;
  workSchedule?: string;
  accessLevel?: AccessLevel;
  managerId?: string;
}

interface PersonModalProps {
  person?: Person;
  onClose: () => void;
}

const accessLevelLabels: Record<string, string> = {
  HIGHEST_MANAGER: 'Highest Manager',
  OP_LEAD: 'OP Lead',
  TRUCK_MOVER: 'Truck Mover',
  EMPLOYEE: 'Employee',
};

export function PersonModal({ person, onClose }: PersonModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!person?.id;

  const [formData, setFormData] = useState({
    name: person?.name || '',
    email: person?.email || '',
    phone: person?.phone || '',
    role: person?.role || 'DRIVER',
    homeArea: person?.homeArea || 'UNASSIGNED',
    workSchedule: person?.workSchedule || 'MON_FRI',
    accessLevel: person?.accessLevel || 'EMPLOYEE' as AccessLevel,
    managerId: person?.managerId || '',
  });

  // Fetch people list for manager dropdown
  const { data: allPeople } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  // Filter to only managers (HIGHEST_MANAGER or OP_LEAD access level)
  const managerOptions = allPeople?.filter(
    (p: any) => p.accessLevel === 'HIGHEST_MANAGER' || p.accessLevel === 'OP_LEAD'
  ) || [];

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        homeArea: data.homeArea,
        workSchedule: data.workSchedule,
        accessLevel: data.accessLevel,
      };
      if (data.phone) payload.phone = data.phone;
      if (data.managerId) payload.managerId = data.managerId;
      return api.post('/invites', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['invites', 'pending'] });
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
      const { email, ...updateData } = formData;
      const payload: any = { ...updateData };
      if (!payload.managerId) delete payload.managerId;
      updateMutation.mutate(payload);
    } else {
      inviteMutation.mutate(formData);
    }
  };

  const isPending = inviteMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Person' : 'Invite Employee'}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Home Area</label>
            <select
              value={formData.homeArea}
              onChange={(e) => setFormData({ ...formData, homeArea: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="FO">FO</option>
              <option value="DOC">DOC</option>
              <option value="UNLOAD">Unload</option>
              <option value="PULLER">Puller</option>
              <option value="UNASSIGNED">Unassigned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
            <select
              value={formData.workSchedule}
              onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="MON_FRI">Mon - Fri</option>
              <option value="TUE_SAT">Tue - Sat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
            <select
              value={formData.accessLevel}
              onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value as AccessLevel })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="HIGHEST_MANAGER">Highest Manager</option>
              <option value="OP_LEAD">OP Lead</option>
              <option value="TRUCK_MOVER">Truck Mover</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Manager</label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="">None</option>
              {managerOptions.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({accessLevelLabels[m.accessLevel] || m.accessLevel})
                </option>
              ))}
            </select>
          </div>

          {inviteMutation.isError && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              Failed to send invite. Please try again.
            </div>
          )}
          {updateMutation.isError && (
            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
              Failed to update person. Please try again.
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending
              ? 'Saving...'
              : isEditing
              ? 'Update Person'
              : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
