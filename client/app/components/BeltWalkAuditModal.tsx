import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { X, Check, XCircle, Key, ArrowLeft, ClipboardCheck, CircleOff, ArrowUpDown } from 'lucide-react';

interface TruckData {
  id: number;
  number: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'OUT_OF_SERVICE';
}

interface BeltSpot {
  id: number;
  number: number;
  truckAssignment?: {
    id: string;
    truck: TruckData;
  } | null;
}

interface Belt {
  id: number;
  name: string;
  letter: string;
  baseNumber: number;
  spots: BeltSpot[];
}

interface BeltWalkAuditModalProps {
  belts: Belt[];
  date: string;
  onClose: () => void;
}

interface SpotCheck {
  spotId: number;
  spotName: string;
  expectedTruck: string | null;
  expectedTruckId: number | null;
  status: 'unchecked' | 'correct' | 'wrong' | 'empty';
  actualTruck: string;
  confirmed: boolean;
}

type AuditStep = 'select-belt' | 'checklist' | 'summary';

export function BeltWalkAuditModal({ belts, date, onClose }: BeltWalkAuditModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<AuditStep>('select-belt');
  const [selectedBelt, setSelectedBelt] = useState<Belt | null>(null);
  const [checks, setChecks] = useState<SpotCheck[]>([]);
  const [fixingAll, setFixingAll] = useState(false);
  const [switchedSpots, setSwitchedSpots] = useState<Set<number>>(new Set());
  const [reversed, setReversed] = useState(false);

  const handleSelectBelt = (belt: Belt) => {
    const sortedSpots = [...belt.spots].sort((a, b) => a.number - b.number);
    const initialChecks: SpotCheck[] = sortedSpots.map((spot) => ({
      spotId: spot.id,
      spotName: `${belt.letter}${spot.number}`,
      expectedTruck: spot.truckAssignment?.truck.number || null,
      expectedTruckId: spot.truckAssignment?.truck.id || null,
      status: spot.truckAssignment ? 'unchecked' : 'correct',
      actualTruck: '',
      confirmed: false,
    }));
    setChecks(initialChecks);
    setSelectedBelt(belt);
    setStep('checklist');
  };

  const handleMarkCorrect = (index: number) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], status: 'correct', actualTruck: '' };
    setChecks(updated);
  };

  const handleMarkWrong = (index: number) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], status: 'wrong' };
    setChecks(updated);
  };

  const handleMarkEmpty = (index: number) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], status: 'empty', actualTruck: '', confirmed: true };
    setChecks(updated);
  };

  const handleActualTruckChange = (index: number, value: string) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], actualTruck: value };
    setChecks(updated);
  };

  const handleConfirmWrong = (index: number) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], confirmed: true };
    setChecks(updated);
  };

  const handleUnconfirm = (index: number) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], confirmed: false };
    setChecks(updated);
  };

  const handleResetSpot = (index: number) => {
    const updated = [...checks];
    updated[index] = { ...updated[index], status: 'unchecked', actualTruck: '', confirmed: false };
    setChecks(updated);
  };

  const assignedChecks = checks.filter((c) => c.expectedTruck !== null);
  const allChecked = assignedChecks.every((c) => c.status !== 'unchecked');
  const wrongChecksComplete = checks
    .filter((c) => c.status === 'wrong')
    .every((c) => c.confirmed && c.actualTruck.trim() !== '');

  const canSubmit = allChecked && wrongChecksComplete;

  const mismatches = checks.filter((c) => c.status === 'wrong' && c.confirmed && c.actualTruck.trim());
  const emptySpots = checks.filter((c) => c.status === 'empty' && c.expectedTruck);

  const fixSpotMutation = useMutation({
    mutationFn: async ({ truckNumber, spotId }: { truckNumber: string; spotId: number }) => {
      const res = await api.get('/trucks');
      const trucks = res.data as Array<{ id: number; number: string }>;
      const truck = trucks.find((t) => t.number === truckNumber);
      if (!truck) throw new Error(`Truck ${truckNumber} not found in system`);
      return api.post('/trucks/spot-assignments', { truckId: truck.id, spotId, date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    },
  });

  const handleFixSpot = (mismatch: SpotCheck) => {
    fixSpotMutation.mutate({
      truckNumber: mismatch.actualTruck.trim(),
      spotId: mismatch.spotId,
    });
  };

  const handleFixAll = async () => {
    setFixingAll(true);
    try {
      const res = await api.get('/trucks');
      const trucks = res.data as Array<{ id: number; number: string }>;

      for (const mismatch of mismatches) {
        const truck = trucks.find((t) => t.number === mismatch.actualTruck.trim());
        if (truck) {
          await api.post('/trucks/spot-assignments', {
            truckId: truck.id,
            spotId: mismatch.spotId,
            date,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['all-belts', date] });
      queryClient.invalidateQueries({ queryKey: ['trucks'] });
    } finally {
      setFixingAll(false);
    }
  };

  const orderedBelts = [...belts].sort((a, b) => a.baseNumber - b.baseNumber);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {step !== 'select-belt' && (
              <button
                onClick={() => {
                  if (step === 'summary') setStep('checklist');
                  else { setStep('select-belt'); setSelectedBelt(null); setChecks([]); }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <ClipboardCheck size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold">
              {step === 'select-belt' && 'Walk Belt — Select Belt'}
              {step === 'checklist' && `Walk Belt ${selectedBelt?.letter}`}
              {step === 'summary' && `Keys Needed — Belt ${selectedBelt?.letter}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Belt Selection */}
        {step === 'select-belt' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {orderedBelts.map((belt) => (
              <button
                key={belt.id}
                onClick={() => handleSelectBelt(belt)}
                className="w-full p-4 bg-blue-50 border border-blue-200 rounded-lg text-left hover:bg-blue-100 transition-colors"
              >
                <span className="font-semibold text-blue-800 text-lg">{belt.letter} Belt</span>
                <span className="text-sm text-gray-500 ml-2">({belt.spots.length} spots)</span>
              </button>
            ))}
          </div>
        )}

        {/* Checklist */}
        {step === 'checklist' && (
          <>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <span className="text-sm text-gray-500">
                {assignedChecks.filter(c => c.status !== 'unchecked').length}/{assignedChecks.length} checked
              </span>
              <button
                onClick={() => setReversed(!reversed)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <ArrowUpDown size={14} />
                {reversed ? 'High → Low' : 'Low → High'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(reversed ? [...checks].reverse() : checks).map((check, displayIndex) => {
                const index = reversed ? checks.length - 1 - displayIndex : displayIndex;
                return (
                <div
                  key={check.spotId}
                  className={`border rounded-lg p-3 ${
                    check.expectedTruck === null
                      ? 'bg-gray-50 border-gray-200 opacity-50'
                      : check.status === 'correct'
                      ? 'bg-green-50 border-green-200'
                      : check.status === 'wrong'
                      ? 'bg-red-50 border-red-200'
                      : check.status === 'empty'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800">{check.spotName}</span>
                      {check.expectedTruck ? (
                        <span className="ml-2 text-gray-600">
                          Expected: <strong>{check.expectedTruck}</strong>
                        </span>
                      ) : (
                        <span className="ml-2 text-gray-400 text-sm">No truck assigned</span>
                      )}
                    </div>

                    {check.expectedTruck && check.status === 'unchecked' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMarkCorrect(index)}
                          className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                          title="Correct"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={() => handleMarkEmpty(index)}
                          className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
                          title="Spot is empty"
                        >
                          <CircleOff size={20} />
                        </button>
                        <button
                          onClick={() => handleMarkWrong(index)}
                          className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                          title="Wrong truck"
                        >
                          <XCircle size={20} />
                        </button>
                      </div>
                    )}

                    {check.status === 'correct' && check.expectedTruck && (
                      <button
                        onClick={() => handleResetSpot(index)}
                        className="text-green-600 font-semibold text-sm hover:underline"
                      >
                        ✓ Correct
                      </button>
                    )}

                    {check.status === 'empty' && check.expectedTruck && (
                      <button
                        onClick={() => handleResetSpot(index)}
                        className="text-amber-600 font-semibold text-sm hover:underline"
                      >
                        Empty — needs key
                      </button>
                    )}

                    {check.status === 'wrong' && (
                      <button
                        onClick={() => handleResetSpot(index)}
                        className="text-red-600 font-semibold text-sm hover:underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  {check.status === 'wrong' && (
                    <div className="mt-2">
                      {check.confirmed ? (
                        <div className="flex items-center justify-between bg-red-100 rounded-md px-3 py-2">
                          <span className="text-sm text-red-800">
                            Actual: <strong>{check.actualTruck}</strong>
                          </span>
                          <button
                            onClick={() => handleUnconfirm(index)}
                            className="text-red-600 text-xs hover:underline"
                          >
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={check.actualTruck}
                            onChange={(e) => handleActualTruckChange(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && check.actualTruck.trim()) {
                                handleConfirmWrong(index);
                              }
                            }}
                            placeholder="Enter actual truck number"
                            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleConfirmWrong(index)}
                            disabled={!check.actualTruck.trim()}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-semibold text-sm"
                          >
                            Confirm
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={() => setStep('summary')}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-semibold"
              >
                {mismatches.length + emptySpots.length > 0
                  ? `View Keys Needed (${mismatches.length + emptySpots.length} issue${mismatches.length + emptySpots.length !== 1 ? 's' : ''})`
                  : 'View Summary'}
              </button>
            </div>
          </>
        )}

        {/* Summary */}
        {step === 'summary' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mismatches.length === 0 && emptySpots.length === 0 ? (
                <div className="text-center py-8">
                  <Check size={48} className="mx-auto text-green-500 mb-3" />
                  <p className="text-xl font-semibold text-green-700">All trucks are correct!</p>
                  <p className="text-gray-500 mt-1">No keys needed.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Key size={20} />
                    <span className="font-semibold">
                      Keys needed for {mismatches.length + emptySpots.length} spot{mismatches.length + emptySpots.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {emptySpots.length > 0 && (
                    <>
                      <h3 className="font-semibold text-amber-800 text-sm uppercase tracking-wide">Empty Spots — Need keys to deliver truck</h3>
                      {emptySpots.map((m) => (
                        <div
                          key={m.spotId}
                          className="border border-amber-200 bg-amber-50 rounded-lg p-4"
                        >
                          <p className="font-semibold text-gray-800">{m.spotName}</p>
                          <div className="mt-2 text-sm">
                            <p>
                              <span className="text-amber-600">Expected:</span>{' '}
                              <strong>{m.expectedTruck}</strong>
                              <span className="text-gray-500 ml-1">— need key to bring it here</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {mismatches.length > 0 && (
                    <>
                      <h3 className="font-semibold text-red-800 text-sm uppercase tracking-wide">Wrong Truck — Need keys to switch</h3>
                      {mismatches.map((m) => {
                        const isSwitched = switchedSpots.has(m.spotId);
                        return (
                          <div
                            key={m.spotId}
                            className={`border rounded-lg p-4 ${
                              isSwitched
                                ? 'border-green-200 bg-green-50 opacity-75'
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-gray-800">{m.spotName}</p>
                              {isSwitched && (
                                <span className="text-green-700 text-sm font-semibold flex items-center gap-1">
                                  <Check size={16} /> Switched
                                </span>
                              )}
                            </div>
                            <div className="mt-2 space-y-1 text-sm">
                              <p>
                                <span className="text-red-600">Found:</span>{' '}
                                <strong>{m.actualTruck}</strong>
                                <span className="text-gray-500 ml-1">(need key to move it out)</span>
                              </p>
                              <p>
                                <span className="text-green-600">Expected:</span>{' '}
                                <strong>{m.expectedTruck}</strong>
                                <span className="text-gray-500 ml-1">(need key to move it here)</span>
                              </p>
                            </div>
                            <div className="flex gap-2 mt-3">
                              {!isSwitched ? (
                                <>
                                  <button
                                    onClick={() => setSwitchedSpots(prev => new Set(prev).add(m.spotId))}
                                    className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                                  >
                                    Mark Switched
                                  </button>
                                  <button
                                    onClick={() => handleFixSpot(m)}
                                    disabled={fixSpotMutation.isPending}
                                    className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    Fix in System
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setSwitchedSpots(prev => {
                                    const next = new Set(prev);
                                    next.delete(m.spotId);
                                    return next;
                                  })}
                                  className="px-4 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-100"
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>

            <div className="p-4 border-t space-y-2">
              {mismatches.length > 0 && (
                <button
                  onClick={handleFixAll}
                  disabled={fixingAll}
                  className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  {fixingAll ? 'Fixing...' : 'Fix All in System'}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
