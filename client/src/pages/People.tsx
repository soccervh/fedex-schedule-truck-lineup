import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { PersonModal } from '../components/PersonModal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const areaLabels = { BELT: 'Belt', DOC: 'Doc', UNLOAD: 'Unload' };
const roleLabels = { DRIVER: 'Driver', SWING: 'Swing', MANAGER: 'Manager' };

export function People() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<any>(null);
  const [filter, setFilter] = useState({ role: '', homeArea: '' });

  const { data: people, isLoading } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      const res = await api.get('/people');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/people/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
    },
  });

  const filteredPeople = people?.filter((p: any) => {
    if (filter.role && p.role !== filter.role) return false;
    if (filter.homeArea && p.homeArea !== filter.homeArea) return false;
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
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Person
        </button>
      </div>

      <div className="flex gap-4">
        <select
          value={filter.role}
          onChange={(e) => setFilter({ ...filter, role: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Roles</option>
          <option value="DRIVER">Driver</option>
          <option value="SWING">Swing</option>
          <option value="MANAGER">Manager</option>
        </select>
        <select
          value={filter.homeArea}
          onChange={(e) => setFilter({ ...filter, homeArea: e.target.value })}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Areas</option>
          <option value="BELT">Belt</option>
          <option value="DOC">Doc</option>
          <option value="UNLOAD">Unload</option>
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
                  Home Area
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPeople?.map((person: any) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {person.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {person.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      person.role === 'SWING' ? 'bg-gray-100' :
                      person.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {roleLabels[person.role as keyof typeof roleLabels]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {areaLabels[person.homeArea as keyof typeof areaLabels]}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <PersonModal person={editingPerson} onClose={closeModal} />}
    </div>
  );
}
