import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { RouteModal } from '../components/RouteModal';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const assignAreaLabels: Record<string, string> = {
  UNASSIGNED: 'Unassigned',
  DOC: 'Doc',
  UNLOAD: 'Unload',
  LABEL_FACER: 'Label Facer',
  SCANNER: 'Scanner',
  SPLITTER: 'Splitter',
  FO: 'FO',
  PULLER: 'Puller',
};

export default function Routes() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const { data: routes, isLoading } = useQuery({
    queryKey: ['routes'],
    queryFn: async () => {
      const res = await api.get('/routes');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/routes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routes'] });
    },
  });

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Deactivate this route?')) {
      deleteMutation.mutate(id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRoute(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Routes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          <Plus size={18} />
          Add Route
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-200px)]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Route Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assign Area
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {routes?.map((route: any) => (
                <tr key={route.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {route.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {route.loadLocation ? assignAreaLabels[route.loadLocation] || route.loadLocation : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleEdit(route)}
                      className="text-gray-400 hover:text-blue-600 mr-3"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(route.id)}
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

      {showModal && <RouteModal route={editingRoute} onClose={closeModal} />}
    </div>
  );
}
