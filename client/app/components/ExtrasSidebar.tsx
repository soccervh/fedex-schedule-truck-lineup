import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Plus, X } from 'lucide-react';

interface MandateEntry {
  id: string;
  note?: string;
  user: { id: string; name: string; role: string; shift: string };
  creator: { name: string };
}

interface VolunteerEntry {
  id: string;
  shift: string;
  user: { id: string; name: string; role: string; shift: string };
}

interface ExtrasSidebarProps {
  mandates: MandateEntry[];
  volunteers: VolunteerEntry[];
  selectedDate: string;
  isManager: boolean;
  currentUserId?: string;
  people?: any[];
}

export function ExtrasSidebar({ mandates, volunteers, selectedDate, isManager, currentUserId, people }: ExtrasSidebarProps) {
  const queryClient = useQueryClient();
  const [showMandateForm, setShowMandateForm] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [mandateUserId, setMandateUserId] = useState('');
  const [mandateNote, setMandateNote] = useState('');
  const [volunteerShift, setVolunteerShift] = useState('AM');

  const isVolunteered = volunteers.some(v => v.user.id === currentUserId);

  const addMandateMutation = useMutation({
    mutationFn: async (data: { userId: string; date: string; note?: string }) => {
      return api.post('/extras/mandates', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandates'] });
      setShowMandateForm(false);
      setMandateUserId('');
      setMandateNote('');
    },
  });

  const deleteMandateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/extras/mandates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mandates'] }),
  });

  const addVolunteerMutation = useMutation({
    mutationFn: async (data: { date: string; shift: string }) => {
      return api.post('/extras/volunteers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      setShowVolunteerForm(false);
    },
  });

  const deleteVolunteerMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/extras/volunteers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteers'] }),
  });

  return (
    <div className="w-48 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-600 flex flex-col">
      {/* Mandates Section */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-600 bg-amber-500 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">MANDATES</h3>
        {isManager && (
          <button
            onClick={() => setShowMandateForm(!showMandateForm)}
            className="text-white hover:text-amber-100"
          >
            {showMandateForm ? <X size={16} /> : <Plus size={16} />}
          </button>
        )}
      </div>

      {showMandateForm && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-600 space-y-2 bg-amber-50 dark:bg-amber-900/20">
          <select
            value={mandateUserId}
            onChange={(e) => setMandateUserId(e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-500 dark:text-white"
          >
            <option value="">Select person...</option>
            {people
              ?.filter((p: any) => p.role !== 'MANAGER')
              .map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
          <input
            type="text"
            value={mandateNote}
            onChange={(e) => setMandateNote(e.target.value)}
            placeholder="Note (optional)"
            className="w-full px-2 py-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-500 dark:text-white"
          />
          <button
            onClick={() => mandateUserId && addMandateMutation.mutate({ userId: mandateUserId, date: selectedDate, note: mandateNote || undefined })}
            disabled={!mandateUserId || addMandateMutation.isPending}
            className="w-full px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
          >
            Add Mandate
          </button>
        </div>
      )}

      <div className="overflow-y-auto" style={{ maxHeight: '150px' }}>
        {mandates.length === 0 ? (
          <div className="p-3 text-xs text-gray-400 dark:text-gray-500">No mandates</div>
        ) : (
          mandates.map((m) => (
            <div key={m.id} className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{m.user.name.split(' ')[0]} {m.user.name.split(' ').slice(1).join(' ').charAt(0)}.</div>
                {m.note && <div className="text-xs text-gray-400 dark:text-gray-500">{m.note}</div>}
              </div>
              {isManager && (
                <button onClick={() => deleteMandateMutation.mutate(m.id)} className="text-gray-300 hover:text-red-500 ml-1 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Volunteers Section */}
      <div className="p-3 border-b border-t border-gray-200 dark:border-gray-600 bg-green-600 flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">VOLUNTEERS</h3>
        {!isVolunteered && (
          <button
            onClick={() => setShowVolunteerForm(!showVolunteerForm)}
            className="text-white hover:text-green-100"
          >
            {showVolunteerForm ? <X size={16} /> : <Plus size={16} />}
          </button>
        )}
      </div>

      {showVolunteerForm && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-600 space-y-2 bg-green-50 dark:bg-green-900/20">
          <div className="flex gap-1">
            {['AM', 'PM'].map((s) => (
              <button
                key={s}
                onClick={() => setVolunteerShift(s)}
                className={`flex-1 px-2 py-1 text-xs rounded border ${
                  volunteerShift === s
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => addVolunteerMutation.mutate({ date: selectedDate, shift: volunteerShift })}
            disabled={addVolunteerMutation.isPending}
            className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Volunteer
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {volunteers.length === 0 ? (
          <div className="p-3 text-xs text-gray-400 dark:text-gray-500">No volunteers</div>
        ) : (
          volunteers.map((v) => (
            <div key={v.id} className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{v.user.name.split(' ')[0]} {v.user.name.split(' ').slice(1).join(' ').charAt(0)}.</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">{v.shift} shift</div>
              </div>
              {(v.user.id === currentUserId || isManager) && (
                <button onClick={() => deleteVolunteerMutation.mutate(v.id)} className="text-gray-300 hover:text-red-500 ml-1 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {mandates.length} mandated · {volunteers.length} volunteered
        </span>
      </div>
    </div>
  );
}
