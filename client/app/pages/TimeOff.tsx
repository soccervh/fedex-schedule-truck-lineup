import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { api } from '../lib/api';
import { Check, X } from 'lucide-react';

export default function TimeOff() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useQueryState('from', {
    defaultValue: new Date().toISOString().split('T')[0],
  });
  const [endDate, setEndDate] = useQueryState('to', {
    defaultValue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [statusFilter, setStatusFilter] = useQueryState('status', {
    defaultValue: 'PENDING',
  });

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
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return api.patch(`/timeoff/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeoffs'] });
    },
  });

  const handleApprove = (id: string) => updateMutation.mutate({ id, status: 'APPROVED' });
  const handleDeny = (id: string) => updateMutation.mutate({ id, status: 'DENIED' });

  const typeLabels = { VACATION: 'Vacation', SICK: 'Sick', SCHEDULED_OFF: 'Scheduled Off' };
  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    DENIED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Time Off Requests</h1>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="DENIED">Denied</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeOffs?.map((to: any) => (
                <tr key={to.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {to.user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {new Date(to.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {typeLabels[to.type as keyof typeof typeLabels]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[to.status as keyof typeof statusColors]}`}>
                      {to.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {to.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(to.id)}
                          className="text-green-600 hover:text-green-800 mr-3"
                          title="Approve"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleDeny(to.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Deny"
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {timeOffs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No time off requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
