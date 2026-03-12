import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { api } from '../lib/api';
import { todayET } from '../lib/date';
import { PersonModal } from '../components/PersonModal';
import { Link } from 'react-router';
import { Plus, Pencil, Trash2, RefreshCw, ShieldOff, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const roleLabels: Record<string, string> = { DRIVER: 'Driver', SWING: 'Swing', MANAGER: 'Manager', CSA: 'CSA', HANDLER: 'Handler' };

const accessLevelLabels: Record<string, string> = {
  HIGHEST_MANAGER: 'Highest Manager',
  OP_LEAD: 'OP Lead',
  TRUCK_MOVER: 'Truck Mover',
  EMPLOYEE: 'Employee',
};

const accessLevelColors: Record<string, string> = {
  HIGHEST_MANAGER: 'bg-red-100 text-red-700',
  OP_LEAD: 'bg-purple-100 text-purple-700',
  TRUCK_MOVER: 'bg-orange-100 text-orange-700',
  EMPLOYEE: 'bg-green-100 text-green-700',
};

export default function People() {
  const queryClient = useQueryClient();
  const { hasAccess } = useAuth();
  const isHighestManager = hasAccess('HIGHEST_MANAGER');
  const canViewDetails = hasAccess('OP_LEAD');
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [role, setRole] = useQueryState('role', { defaultValue: '' });
  const [accessLevelFilter, setAccessLevelFilter] = useQueryState('accessLevel', { defaultValue: '' });
  const [selectedDate, setSelectedDate] = useState(todayET());

  const { data: people, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  const { data: driverRoutes } = useQuery({
    queryKey: ['driver-routes'],
    queryFn: async () => {
      const res = await api.get('/people/driver-routes');
      return res.data as Record<string, { weekday?: { routeId: number; routeNumber: string; schedule: string }; saturday?: { routeId: number; routeNumber: string; schedule: string } }>;
    },
  });

  const { data: allRoutes } = useQuery({
    queryKey: ['routes-all'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data as Array<{ id: number; number: string; beltSpotId: number | null; beltSpot: any }>;
    },
  });

  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ['invites', 'pending'],
    queryFn: async () => {
      const res = await api.get('/invites/pending');
      return res.data;
    },
    enabled: isHighestManager,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/people/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post(`/invites/${id}/resend`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invites', 'pending'] });
      if (data.inviteLink) {
        navigator.clipboard.writeText(data.inviteLink);
        setCopiedId('resend');
        setTimeout(() => setCopiedId(null), 3000);
      }
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/invites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      return api.patch(`/people/${id}/suspend`, { isSuspended });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });

  const assignRouteMutation = useMutation({
    mutationFn: async ({ userId, routeId }: { userId: string; routeId: number }) => {
      const res = await api.post('/people/assign-route', { userId, routeId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-routes'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas'] });
    },
  });

  const unassignRouteMutation = useMutation({
    mutationFn: async ({ userId, schedule }: { userId: string; schedule?: string }) => {
      return api.post('/people/unassign-route', { userId, schedule });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-routes'] });
      queryClient.invalidateQueries({ queryKey: ['all-belts'] });
      queryClient.invalidateQueries({ queryKey: ['facility-route-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['facility-areas'] });
    },
  });

  // Build a map of routeId → driver name for showing who's on each route
  const routeDriverMap: Record<number, string> = {};
  if (driverRoutes && people) {
    for (const [userId, info] of Object.entries(driverRoutes)) {
      const person = people.find((p: any) => p.id === userId);
      if (person) {
        if (info.weekday?.routeId) routeDriverMap[info.weekday.routeId] = person.name.split(' ')[0];
        if (info.saturday?.routeId) routeDriverMap[info.saturday.routeId] = person.name.split(' ')[0];
      }
    }
  }

  const handleRouteChange = (person: any, value: string, scheduleType?: 'WEEKDAY' | 'SAT_ONLY') => {
    if (value === '') {
      unassignRouteMutation.mutate({ userId: person.id, schedule: scheduleType });
    } else {
      const routeId = parseInt(value);
      assignRouteMutation.mutate({ userId: person.id, routeId });
    }
  };

  const handleDeleteInvite = (id: string, name: string) => {
    if (confirm(`Delete pending invite for ${name}?`)) {
      deleteInviteMutation.mutate(id);
    }
  };

  const filteredPeople = people?.filter((p: any) => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (role && p.role !== role) return false;
    if (accessLevelFilter && p.accessLevel !== accessLevelFilter) return false;
    return true;
  });

  const handleEdit = (person: any) => {
    setEditingPerson(person);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deactivate this person?')) {
      deleteMutation.mutate(id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPerson(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">People</h1>
        {isHighestManager && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Employee
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="px-2 py-1.5 border rounded-md text-sm w-32 sm:w-40 dark:bg-gray-700 dark:border-gray-500 dark:text-white"
        />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-500 dark:text-white"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-500 dark:text-white"
        >
          <option value="">All Roles</option>
          <option value="DRIVER">Driver</option>
          <option value="SWING">Swing</option>
          <option value="MANAGER">Manager</option>
          <option value="CSA">CSA</option>
          <option value="HANDLER">Handler</option>
        </select>
        <select
          value={accessLevelFilter}
          onChange={(e) => setAccessLevelFilter(e.target.value)}
          className="hidden sm:block px-2 py-1.5 border rounded-md text-sm dark:bg-gray-700 dark:border-gray-500 dark:text-white"
        >
          <option value="">All Access Levels</option>
          <option value="HIGHEST_MANAGER">Highest Manager</option>
          <option value="OP_LEAD">OP Lead</option>
          <option value="TRUCK_MOVER">Truck Mover</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Name
                </th>
                <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Role
                </th>
                <th className="px-2 sm:px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase" title="Permanent route assignment — this person will show on this spot every workday">
                  Route (Permanent)
                </th>
                <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Access Level
                </th>
                {isHighestManager && (
                  <th className="px-2 sm:px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredPeople?.map((person: any) => (
                <tr key={person.id}>
                  <td className="px-3 py-3 whitespace-nowrap font-medium text-sm">
                    <div className="flex items-center gap-1.5">
                      {canViewDetails ? (
                        <Link to={`/people/${person.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {person.name}
                        </Link>
                      ) : (
                        person.name
                      )}
                      {person.isSuspended && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 font-medium">
                          SUSPENDED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                    {person.email || <span className="text-gray-300 dark:text-gray-600 italic">No email</span>}
                  </td>
                  <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      person.role === 'SWING' ? 'bg-gray-100' :
                      person.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                      person.role === 'CSA' ? 'bg-teal-100 text-teal-700' :
                      person.role === 'HANDLER' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {roleLabels[person.role] || person.role}
                    </span>
                  </td>
                  <td className="px-2 sm:px-3 py-3 whitespace-nowrap">
                    {['DRIVER', 'SWING'].includes(person.role) ? (
                      canViewDetails ? (
                        <div className="flex flex-col gap-1">
                          {/* Weekday route dropdown */}
                          <select
                            value={driverRoutes?.[person.id]?.weekday?.routeId ?? ''}
                            onChange={(e) => handleRouteChange(person, e.target.value, 'WEEKDAY')}
                            className="px-1 sm:px-2 py-1 text-xs sm:text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-500 dark:text-white max-w-[90px] sm:max-w-none"
                            disabled={assignRouteMutation.isPending || unassignRouteMutation.isPending}
                          >
                            <option value="">{person.workSchedule === 'TUE_SAT' ? '— Weekday —' : '— None —'}</option>
                            {allRoutes
                              ?.filter((r: any) => r.beltSpotId && r.schedule !== 'SAT_ONLY')
                              .map((r: any) => {
                                const driver = routeDriverMap[r.id];
                                const isCurrent = driverRoutes?.[person.id]?.weekday?.routeId === r.id;
                                const label = driver && !isCurrent ? `R:${r.number} (${driver})` : `R:${r.number}`;
                                return (
                                  <option key={r.id} value={r.id}>
                                    {label}
                                  </option>
                                );
                              })}
                          </select>
                          {/* Saturday route dropdown — only for TUE_SAT workers */}
                          {person.workSchedule === 'TUE_SAT' && (
                            <select
                              value={driverRoutes?.[person.id]?.saturday?.routeId ?? ''}
                              onChange={(e) => handleRouteChange(person, e.target.value, 'SAT_ONLY')}
                              className="px-1 sm:px-2 py-1 text-xs sm:text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-500 dark:text-white max-w-[90px] sm:max-w-none"
                              disabled={assignRouteMutation.isPending || unassignRouteMutation.isPending}
                            >
                              <option value="">— Saturday —</option>
                              {allRoutes
                                ?.filter((r: any) => r.beltSpotId && r.schedule === 'SAT_ONLY')
                                .map((r: any) => {
                                  const driver = routeDriverMap[r.id];
                                  const isCurrent = driverRoutes?.[person.id]?.saturday?.routeId === r.id;
                                  const label = driver && !isCurrent ? `R:${r.number} (${driver})` : `R:${r.number}`;
                                  return (
                                    <option key={r.id} value={r.id}>
                                      {label}
                                    </option>
                                  );
                                })}
                            </select>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {driverRoutes?.[person.id]?.weekday?.routeNumber
                              ? `R:${driverRoutes[person.id].weekday!.routeNumber}`
                              : '—'}
                          </span>
                          {person.workSchedule === 'TUE_SAT' && driverRoutes?.[person.id]?.saturday?.routeNumber && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Sat: R:{driverRoutes[person.id].saturday!.routeNumber}
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-3 py-3 whitespace-nowrap">
                    {person.accessLevel && (
                      <span className={`px-2 py-1 text-xs rounded-full ${accessLevelColors[person.accessLevel] || 'bg-gray-100 text-gray-700'}`}>
                        {accessLevelLabels[person.accessLevel] || person.accessLevel}
                      </span>
                    )}
                  </td>
                  {isHighestManager && (
                    <td className="px-2 sm:px-3 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(person)}
                        className="text-gray-400 hover:text-blue-600 mr-2"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      {person.email && (
                        <button
                          onClick={() => suspendMutation.mutate({ id: person.id, isSuspended: !person.isSuspended })}
                          className={`mr-2 ${person.isSuspended ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-yellow-600'}`}
                          title={person.isSuspended ? 'Unsuspend' : 'Suspend'}
                          disabled={suspendMutation.isPending}
                        >
                          {person.isSuspended ? <Shield size={16} /> : <ShieldOff size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Deactivate"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Invites Section - HIGHEST_MANAGER only */}
      {isHighestManager && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Pending Invites</h2>
          {invitesLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading invites...</div>
          ) : pendingInvites?.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow">
              No pending invites
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Access Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {pendingInvites?.map((invite: any) => (
                    <tr key={invite.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {invite.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {invite.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          invite.role === 'SWING' ? 'bg-gray-100' :
                          invite.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                          invite.role === 'CSA' ? 'bg-teal-100 text-teal-700' :
                          invite.role === 'HANDLER' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {roleLabels[invite.role] || invite.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invite.accessLevel && (
                          <span className={`px-2 py-1 text-xs rounded-full ${accessLevelColors[invite.accessLevel] || 'bg-gray-100 text-gray-700'}`}>
                            {accessLevelLabels[invite.accessLevel] || invite.accessLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invite.inviteExpired ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={() => resendMutation.mutate(invite.id)}
                          disabled={resendMutation.isPending}
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          <RefreshCw size={14} />
                          {copiedId === 'resend' ? 'Sent & Copied!' : resendMutation.isPending ? 'Sending...' : 'Resend'}
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(invite.id, invite.name)}
                          disabled={deleteInviteMutation.isPending}
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showModal && <PersonModal person={editingPerson} onClose={closeModal} />}
    </div>
  );
}
