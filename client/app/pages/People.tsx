import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useQueryState } from 'nuqs';
import { api } from '../lib/api';
import { PersonModal } from '../components/PersonModal';
import { Link } from 'react-router';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
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
  const [role, setRole] = useQueryState('role', { defaultValue: '' });
  const [accessLevelFilter, setAccessLevelFilter] = useQueryState('accessLevel', { defaultValue: '' });

  const { data: people, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
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

  const handleDeleteInvite = (id: string, name: string) => {
    if (confirm(`Delete pending invite for ${name}?`)) {
      deleteInviteMutation.mutate(id);
    }
  };

  const filteredPeople = people?.filter((p: any) => {
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
            Invite Employee
          </button>
        )}
      </div>

      <div className="flex gap-4">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 border rounded-md"
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
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Access Levels</option>
          <option value="HIGHEST_MANAGER">Highest Manager</option>
          <option value="OP_LEAD">OP Lead</option>
          <option value="TRUCK_MOVER">Truck Mover</option>
          <option value="EMPLOYEE">Employee</option>
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
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Access Level
                </th>
                {isHighestManager && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPeople?.map((person: any) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {canViewDetails ? (
                      <Link to={`/people/${person.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                        {person.name}
                      </Link>
                    ) : (
                      person.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {person.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {person.accessLevel && (
                      <span className={`px-2 py-1 text-xs rounded-full ${accessLevelColors[person.accessLevel] || 'bg-gray-100 text-gray-700'}`}>
                        {accessLevelLabels[person.accessLevel] || person.accessLevel}
                      </span>
                    )}
                  </td>
                  {isHighestManager && (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleEdit(person)}
                        className="text-gray-400 hover:text-blue-600 mr-3"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(person.id)}
                        className="text-gray-400 hover:text-red-600"
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
            <div className="text-center py-8 text-gray-500">Loading invites...</div>
          ) : pendingInvites?.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
              No pending invites
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Access Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sent
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
                  {pendingInvites?.map((invite: any) => (
                    <tr key={invite.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">
                        {invite.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
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
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
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
