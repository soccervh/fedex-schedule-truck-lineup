import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { api } from '../lib/api';
import { todayET, formatDateET } from '../lib/date';
import { Check, X, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TimeOffCalendar } from '../components/TimeOffCalendar';

const typeLabels: Record<string, string> = {
  VACATION_WEEK: 'Vacation Week',
  VACATION_DAY: 'Vacation Day',
  PERSONAL: 'Personal',
  HOLIDAY: 'Holiday',
  SICK: 'Sick',
  SCHEDULED_OFF: 'Scheduled Off',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
};

export default function TimeOff() {
  const queryClient = useQueryClient();
  const { hasAccess } = useAuth();
  const isManager = hasAccess('OP_LEAD');

  const [startDate, setStartDate] = useQueryState('from', {
    defaultValue: todayET(),
  });
  const [endDate, setEndDate] = useQueryState('to', {
    defaultValue: formatDateET(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  });
  const [statusFilter, setStatusFilter] = useQueryState('status', {
    defaultValue: 'PENDING',
  });
  const [editing, setEditing] = useState<any>(null);

  const { data: timeOffs, isLoading } = useQuery({
    queryKey: ['timeoffs', startDate, endDate, statusFilter],
    queryFn: async () => {
      const res = await api.get('/timeoff', {
        params: {
          startDate,
          endDate,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
    enabled: isManager,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['timeoffs'] });
    queryClient.invalidateQueries({ queryKey: ['timeoff-calendar'] });
    queryClient.invalidateQueries({ queryKey: ['coverage'] });
    queryClient.invalidateQueries({ queryKey: ['all-belts'] });
    queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; status?: string; type?: string; note?: string }) => {
      return api.patch(`/timeoff/${id}`, data);
    },
    onSuccess: () => {
      invalidateAll();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/timeoff/${id}`);
    },
    onSuccess: invalidateAll,
  });

  const handleApprove = (id: string) => updateMutation.mutate({ id, status: 'APPROVED' });
  const handleDeny = (id: string) => updateMutation.mutate({ id, status: 'DENIED' });
  const handleDelete = (id: string, name: string, date: string) => {
    if (confirm(`Delete time off entry for ${name} on ${new Date(date).toLocaleDateString()}?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Time Off</h1>

      {/* Calendar - visible to everyone */}
      <TimeOffCalendar />

      {/* Manager request table - OP_LEAD+ only */}
      {isManager && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Manage Requests</h2>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Person</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Note</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {timeOffs?.map((to: any) => (
                    <tr key={to.id}>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-sm">{to.user.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(to.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {typeLabels[to.type] || to.type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusColors[to.status] || ''}`}>
                          {to.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 max-w-[150px] truncate">
                        {to.note || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {to.status === 'PENDING' && (
                            <>
                              <button onClick={() => handleApprove(to.id)} className="text-green-600 hover:text-green-800 p-1" title="Approve">
                                <Check size={16} />
                              </button>
                              <button onClick={() => handleDeny(to.id)} className="text-red-600 hover:text-red-800 p-1" title="Deny">
                                <X size={16} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setEditing(to)} className="text-gray-400 hover:text-blue-600 p-1" title="Edit">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDelete(to.id, to.user.name, to.date)} className="text-gray-400 hover:text-red-600 p-1" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {timeOffs?.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No time off requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <EditTimeOffModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateMutation.mutate({ id: editing.id, ...data })}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function EditTimeOffModal({
  entry,
  onClose,
  onSave,
  isPending,
}: {
  entry: any;
  onClose: () => void;
  onSave: (data: { type?: string; status?: string; note?: string }) => void;
  isPending: boolean;
}) {
  const [type, setType] = useState(entry.type);
  const [status, setStatus] = useState(entry.status);
  const [note, setNote] = useState(entry.note || '');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-600">
          <h3 className="font-semibold dark:text-white">Edit Time Off</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>{entry.user.name}</strong> — {new Date(entry.date).toLocaleDateString()}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white">
              <option value="VACATION_WEEK">Vacation Week</option>
              <option value="VACATION_DAY">Vacation Day</option>
              <option value="PERSONAL">Personal</option>
              <option value="HOLIDAY">Holiday</option>
              <option value="SICK">Sick</option>
              <option value="SCHEDULED_OFF">Scheduled Off</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="DENIED">Denied</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Note</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-500 dark:text-white"
              placeholder="Optional note..."
            />
          </div>
          <button
            onClick={() => onSave({ type, status, note })}
            disabled={isPending}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
