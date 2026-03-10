import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { todayET } from '../lib/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const typeColors: Record<string, string> = {
  VACATION_WEEK: 'bg-blue-500',
  VACATION_DAY: 'bg-blue-400',
  PERSONAL: 'bg-purple-500',
  HOLIDAY: 'bg-green-500',
  SICK: 'bg-red-500',
  SCHEDULED_OFF: 'bg-gray-500',
};

const typeLabels: Record<string, string> = {
  VACATION_WEEK: 'V',
  VACATION_DAY: 'V',
  PERSONAL: 'P',
  HOLIDAY: 'H',
  SICK: 'S',
  SCHEDULED_OFF: 'O',
};

function formatName(fullName: string): string {
  const parts = fullName.split(' ');
  if (parts.length < 2) return fullName;
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
}

export function TimeOffCalendar() {
  const today = todayET();
  const [year, setYear] = useState(parseInt(today.split('-')[0]));
  const [month, setMonth] = useState(parseInt(today.split('-')[1]));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStr = `${year}-${String(month).padStart(2, '0')}`;

  const { data: calendarData } = useQuery({
    queryKey: ['timeoff-calendar', monthStr],
    queryFn: async () => {
      const res = await api.get(`/timeoff/calendar?month=${monthStr}`);
      return res.data as Record<string, { user: { id: string; name: string; role: string }; type: string }[]>;
    },
  });

  const goToPrev = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const goToNext = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const monthName = firstDay.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = new Array(startDow).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const selectedEntries = selectedDate && calendarData?.[selectedDate] || [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button onClick={goToPrev} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <button onClick={goToNext} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-t border-gray-200 dark:border-gray-600">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="min-h-[60px] bg-gray-50 dark:bg-gray-900/30" />;

              const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const entries = calendarData?.[dateStr] || [];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const isWeekend = di === 0 || di === 6;

              return (
                <button
                  key={di}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`min-h-[60px] p-1 text-left border-r border-gray-100 dark:border-gray-700 last:border-r-0 transition-colors ${
                    isSelected ? 'bg-blue-50 dark:bg-blue-900/30' :
                    isWeekend ? 'bg-gray-50/50 dark:bg-gray-900/20' :
                    'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className={`text-xs font-medium mb-0.5 ${
                    isToday ? 'bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center' :
                    'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day}
                  </div>
                  {entries.length > 0 && (
                    <div className="flex flex-wrap gap-0.5">
                      {entries.slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className={`inline-block w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center ${typeColors[e.type] || 'bg-gray-400'}`}
                          title={`${e.user.name} - ${e.type}`}
                        >
                          {typeLabels[e.type] || '?'}
                        </span>
                      ))}
                      {entries.length > 3 && (
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">
                          +{entries.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected date detail */}
      {selectedDate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {selectedEntries.length > 0 && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                ({selectedEntries.length} off)
              </span>
            )}
          </h3>
          {selectedEntries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No one off this day</p>
          ) : (
            <div className="space-y-1">
              {selectedEntries.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`inline-block w-2 h-2 rounded-full ${typeColors[e.type] || 'bg-gray-400'}`} />
                  <span className="font-medium">{e.user.name}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    {e.type === 'VACATION_WEEK' ? 'Vacation' :
                     e.type === 'VACATION_DAY' ? 'Vacation Day' :
                     e.type === 'PERSONAL' ? 'Personal' :
                     e.type === 'HOLIDAY' ? 'Holiday' :
                     e.type === 'SICK' ? 'Sick' :
                     e.type === 'SCHEDULED_OFF' ? 'Scheduled Off' : e.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Vacation</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-purple-500" /> Personal</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" /> Holiday</div>
        <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Sick</div>
      </div>
    </div>
  );
}
