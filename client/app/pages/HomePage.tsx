import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Pencil, Check, X } from 'lucide-react';

interface Briefing {
  date: string;
  startTime: string | null;
  planeArrival: string | null;
  lateFreight: string | null;
}

export default function HomePage() {
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: briefing } = useQuery({
    queryKey: ['briefing', today],
    queryFn: async () => {
      const res = await api.get(`/briefing?date=${today}`);
      return res.data as Briefing;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Briefing> & { date: string }) => {
      return api.put('/briefing', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefing', today] });
      setEditingField(null);
    },
  });

  const startEdit = (field: string, currentValue: string | null) => {
    setEditingField(field);
    setEditValue(currentValue || '');
  };

  const saveEdit = (field: string) => {
    updateMutation.mutate({
      date: today,
      [field]: editValue || null,
    });
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const renderField = (label: string, field: keyof Briefing, value: string | null) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</h3>
        {isManager && editingField !== field && (
          <button
            onClick={() => startEdit(field, value)}
            className="text-gray-400 hover:text-blue-600"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editingField === field ? (
        <div className="flex items-center gap-2">
          {field === 'lateFreight' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-lg"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-lg"
              placeholder={field === 'startTime' ? 'e.g. 3:30 AM' : 'e.g. 4:15 AM'}
              autoFocus
            />
          )}
          <button
            onClick={() => saveEdit(field)}
            className="text-green-600 hover:text-green-700 p-1"
          >
            <Check size={20} />
          </button>
          <button
            onClick={cancelEdit}
            className="text-gray-400 hover:text-red-600 p-1"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        <p className={`text-2xl font-semibold ${value ? 'text-gray-900' : 'text-gray-300'}`}>
          {value || 'Not set'}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Daily Briefing</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderField('Start Time', 'startTime', briefing?.startTime ?? null)}
        {renderField('Plane Arrival', 'planeArrival', briefing?.planeArrival ?? null)}
      </div>

      {renderField('Late Freight', 'lateFreight', briefing?.lateFreight ?? null)}

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Route Changes Today
        </h3>
        <p className="text-gray-400 text-sm">
          Route change detection will show here when routes differ from their default assignments.
        </p>
      </div>
    </div>
  );
}
