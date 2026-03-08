import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X } from 'lucide-react';
import type { AccessLevel } from '../contexts/AuthContext';

interface Person {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string;
  role: 'DRIVER' | 'SWING' | 'MANAGER' | 'CSA' | 'HANDLER';
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

  // Create with invite (has email) — uses /invites
  const inviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        email: data.email,
        role: data.role,
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

  // Create without invite (no email) — uses /people
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload: any = {
        name: data.name,
        role: data.role,
        workSchedule: data.workSchedule,
        accessLevel: data.accessLevel,
      };
      if (data.phone) payload.phone = data.phone;
      if (data.managerId) payload.managerId = data.managerId;
      return api.post('/people', payload);
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
      queryClient.invalidateQueries({ queryKey: ['invites', 'pending'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      const payload: any = { ...formData };
      if (!payload.managerId) delete payload.managerId;
      if (!payload.email) payload.email = null;
      updateMutation.mutate(payload);
    } else if (formData.email) {
      inviteMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = inviteMutation.isPending || createMutation.isPending || updateMutation.isPending;

  const getSubmitLabel = () => {
    if (isPending) return 'Saving...';
    if (isEditing) return 'Update Person';
    if (formData.email) return 'Send Invite';
    return 'Add Employee';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-600">
          <h2 className="text-lg font-semibold dark:text-white">
            {isEditing ? 'Edit Person' : 'Add Employee'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email {!isEditing && <span className="text-gray-400 font-normal">(optional — invite sent if provided)</span>}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
              placeholder={isEditing && !person?.email ? 'Add email to send invite...' : ''}
            />
            {isEditing && !person?.email && formData.email && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                An invite will be sent when you save.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
            >
              <option value="DRIVER">Driver</option>
              <option value="SWING">Swing Driver</option>
              <option value="MANAGER">Manager</option>
              <option value="CSA">CSA</option>
              <option value="HANDLER">Handler</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Work Schedule</label>
            <select
              value={formData.workSchedule}
              onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
            >
              <option value="MON_FRI">Mon - Fri</option>
              <option value="TUE_SAT">Tue - Sat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Level</label>
            <select
              value={formData.accessLevel}
              onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value as AccessLevel })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
            >
              <option value="HIGHEST_MANAGER">Highest Manager</option>
              <option value="OP_LEAD">OP Lead</option>
              <option value="TRUCK_MOVER">Truck Mover</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Manager</label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
            >
              <option value="">None</option>
              {managerOptions.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({accessLevelLabels[m.accessLevel] || m.accessLevel})
                </option>
              ))}
            </select>
          </div>

          {(inviteMutation.isError || createMutation.isError) && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm">
              Failed to create employee. Please try again.
            </div>
          )}
          {updateMutation.isError && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded text-sm">
              Failed to update person. Please try again.
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {getSubmitLabel()}
          </button>
        </form>
      </div>
    </div>
  );
}
