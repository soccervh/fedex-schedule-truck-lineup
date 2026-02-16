import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Check, X, Save } from 'lucide-react';

const roleLabels: Record<string, string> = {
  DRIVER: 'Driver', SWING: 'Swing', MANAGER: 'Manager', CSA: 'CSA', HANDLER: 'Handler',
};
const typeLabels: Record<string, string> = {
  VACATION_WEEK: 'Vacation Week', VACATION_DAY: 'Vacation Day', PERSONAL: 'Personal',
  HOLIDAY: 'Holiday', SICK: 'Sick', SCHEDULED_OFF: 'Scheduled Off',
};
const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  DENIED: 'bg-red-100 text-red-800',
};

export default function PersonDetail() {
  const { id } = useParams();
  const { isManager } = useAuth();
  const queryClient = useQueryClient();

  const { data: person, isLoading } = useQuery({
    queryKey: ['person', id],
    queryFn: async () => {
      const res = await api.get(`/people/${id}`);
      return res.data;
    },
  });

  const [infoForm, setInfoForm] = useState<any>(null);
  const [balanceForm, setBalanceForm] = useState<any>(null);

  // Initialize forms when data loads
  if (person && !infoForm) {
    setInfoForm({
      name: person.name,
      email: person.email,
      phone: person.phone || '',
      role: person.role,
      homeArea: person.homeArea,
      workSchedule: person.workSchedule,
    });
    setBalanceForm({
      vacationWeeks: person.vacationWeeks,
      vacationDays: person.vacationDays,
      personalDays: person.personalDays,
      holidays: person.holidays,
      sickDays: person.sickDays,
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.put(`/people/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
    },
  });

  const timeoffMutation = useMutation({
    mutationFn: async ({ toId, status }: { toId: string; status: string }) => {
      return api.patch(`/timeoff/${toId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', id] });
      queryClient.invalidateQueries({ queryKey: ['timeoffs'] });
    },
  });

  const handleSaveInfo = () => {
    if (infoForm) updateMutation.mutate(infoForm);
  };

  const handleSaveBalances = () => {
    if (balanceForm) updateMutation.mutate(balanceForm);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  if (!person) {
    return <div className="text-center py-8 text-gray-500">Person not found</div>;
  }

  const balanceRows = [
    {
      label: 'Vacation Weeks',
      field: 'vacationWeeks',
      allocated: balanceForm?.vacationWeeks ?? 0,
      used: person.usedBalances?.VACATION_WEEK ?? 0,
      carryover: 0,
    },
    {
      label: 'Vacation Days',
      field: 'vacationDays',
      allocated: balanceForm?.vacationDays ?? 0,
      used: person.usedBalances?.VACATION_DAY ?? 0,
      carryover: 0,
    },
    {
      label: 'Personal Days',
      field: 'personalDays',
      allocated: balanceForm?.personalDays ?? 0,
      used: person.usedBalances?.PERSONAL ?? 0,
      carryover: 0,
    },
    {
      label: 'Holidays',
      field: 'holidays',
      allocated: balanceForm?.holidays ?? 0,
      used: person.usedBalances?.HOLIDAY ?? 0,
      carryover: 0,
    },
    {
      label: 'Sick Days',
      field: 'sickDays',
      allocated: balanceForm?.sickDays ?? 0,
      used: person.usedBalances?.SICK ?? 0,
      carryover: person.sickDayCarryover ?? 0,
    },
  ];

  return (
    <div className="space-y-6">
      <Link to="/people" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm">
        <ArrowLeft size={16} /> Back to People
      </Link>

      <h1 className="text-2xl font-bold">{person.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Person Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Person Info</h2>
          {infoForm && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={infoForm.name}
                  onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={infoForm.email}
                  onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={infoForm.phone}
                  onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={infoForm.role}
                  onChange={(e) => setInfoForm({ ...infoForm, role: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
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
                  value={infoForm.homeArea}
                  onChange={(e) => setInfoForm({ ...infoForm, homeArea: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
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
                  value={infoForm.workSchedule}
                  onChange={(e) => setInfoForm({ ...infoForm, workSchedule: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={!isManager}
                >
                  <option value="MON_FRI">Mon - Fri</option>
                  <option value="TUE_SAT">Tue - Sat</option>
                </select>
              </div>
              {isManager && (
                <button
                  onClick={handleSaveInfo}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {updateMutation.isPending ? 'Saving...' : 'Save Info'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Time Off Balances Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Time Off Balances</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                <th className="pb-2">Type</th>
                <th className="pb-2">Allocated</th>
                <th className="pb-2">Used</th>
                <th className="pb-2">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {balanceRows.map((row) => {
                const remaining = row.allocated + row.carryover - row.used;
                return (
                  <tr key={row.field}>
                    <td className="py-2 text-sm font-medium">{row.label}</td>
                    <td className="py-2">
                      {isManager && balanceForm ? (
                        <input
                          type="number"
                          min={0}
                          value={balanceForm[row.field]}
                          onChange={(e) =>
                            setBalanceForm({ ...balanceForm, [row.field]: parseInt(e.target.value) || 0 })
                          }
                          className="w-16 px-2 py-1 border rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm">{row.allocated}</span>
                      )}
                    </td>
                    <td className="py-2 text-sm">
                      {row.used}
                      {row.carryover > 0 && (
                        <span className="text-xs text-gray-500 ml-1">(+{row.carryover} carryover)</span>
                      )}
                    </td>
                    <td className={`py-2 text-sm font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {remaining}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isManager && (
            <button
              onClick={handleSaveBalances}
              disabled={updateMutation.isPending}
              className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {updateMutation.isPending ? 'Saving...' : 'Save Balances'}
            </button>
          )}
        </div>
      </div>

      {/* Time Off History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Time Off History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
                {isManager && (
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {person.timeOffs?.map((to: any) => (
                <tr key={to.id}>
                  <td className="px-4 py-3 text-sm">{new Date(to.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm">{typeLabels[to.type] || to.type}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[to.status]}`}>
                      {to.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{to.note || '-'}</td>
                  {isManager && (
                    <td className="px-4 py-3 text-right">
                      {to.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => timeoffMutation.mutate({ toId: to.id, status: 'APPROVED' })}
                            className="text-green-600 hover:text-green-800 mr-2"
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => timeoffMutation.mutate({ toId: to.id, status: 'DENIED' })}
                            className="text-red-600 hover:text-red-800"
                            title="Deny"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(!person.timeOffs || person.timeOffs.length === 0) && (
                <tr>
                  <td colSpan={isManager ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                    No time off records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
