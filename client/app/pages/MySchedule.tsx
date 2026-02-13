import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function MySchedule() {
  useAuth(); // Ensure user is authenticated
  const queryClient = useQueryClient();

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const [requestDates, setRequestDates] = useState<string[]>([]);
  const [requestType, setRequestType] = useState<string>('VACATION');
  const [showRequestForm, setShowRequestForm] = useState(false);

  const { data: assignments } = useQuery({
    queryKey: ['my-assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments/my-assignments', {
        params: {
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
        },
      });
      return res.data;
    },
  });

  const { data: myTimeOffs } = useQuery({
    queryKey: ['my-timeoffs'],
    queryFn: async () => {
      const res = await api.get('/timeoff/mine');
      return res.data;
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: { dates: string[]; type: string }) => {
      return api.post('/timeoff/request', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-timeoffs'] });
      setShowRequestForm(false);
      setRequestDates([]);
    },
  });

  const todayAssignment = assignments?.find(
    (a: any) => new Date(a.date).toDateString() === today.toDateString()
  );

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (requestDates.length === 0) return;
    requestMutation.mutate({ dates: requestDates, type: requestType });
  };

  const statusColors = {
    PENDING: 'text-yellow-600',
    APPROVED: 'text-green-600',
    DENIED: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Today's Assignment</h2>
        {todayAssignment ? (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              Belt {todayAssignment.spot.belt.id} - Spot {todayAssignment.spot.number}
            </div>
            <div className="text-lg text-blue-700 mt-1">
              Truck: {todayAssignment.truckNumber}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No assignment for today</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">This Week</h2>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const assignment = assignments?.find(
              (a: any) => new Date(a.date).toDateString() === date.toDateString()
            );
            const isToday = date.toDateString() === today.toDateString();

            return (
              <div
                key={i}
                className={`p-3 rounded-lg border text-center ${
                  isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="text-xs text-gray-500">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="font-medium">{date.getDate()}</div>
                {assignment ? (
                  <div className="text-xs mt-1">
                    B{assignment.spot.belt.id}-S{assignment.spot.number}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 mt-1">-</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Time Off</h2>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
          >
            Request Time Off
          </button>
        </div>

        {showRequestForm && (
          <form onSubmit={handleSubmitRequest} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date(s)
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    if (e.target.value && !requestDates.includes(e.target.value)) {
                      setRequestDates([...requestDates, e.target.value]);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  {requestDates.map((d) => (
                    <span
                      key={d}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {new Date(d).toLocaleDateString()}
                      <button
                        type="button"
                        onClick={() => setRequestDates(requestDates.filter((x) => x !== d))}
                        className="ml-1"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="VACATION">Vacation</option>
                  <option value="SICK">Sick</option>
                  <option value="SCHEDULED_OFF">Scheduled Off</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={requestDates.length === 0 || requestMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {requestMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {myTimeOffs?.slice(0, 10).map((to: any) => (
            <div key={to.id} className="flex items-center justify-between py-2 border-b">
              <span>{new Date(to.date).toLocaleDateString()}</span>
              <span className="text-sm text-gray-500">{to.type}</span>
              <span className={`text-sm font-medium ${statusColors[to.status as keyof typeof statusColors]}`}>
                {to.status}
              </span>
            </div>
          ))}
          {myTimeOffs?.length === 0 && (
            <p className="text-gray-500 text-center py-4">No time off requests</p>
          )}
        </div>
      </div>
    </div>
  );
}
