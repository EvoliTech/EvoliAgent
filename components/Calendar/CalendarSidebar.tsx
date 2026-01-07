import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Filter } from 'lucide-react';
import { specialistService } from '../../services/specialistService';
import { Specialist } from '../../types';

interface CalendarSidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  selectedSpecialists: string[];
  onToggleSpecialist: (id: string) => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  currentDate,
  onDateChange,
  selectedSpecialists,
  onToggleSpecialist
}) => {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSpecialists();

    const subscription = specialistService.subscribeToSpecialists(() => {
      loadSpecialists();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadSpecialists = async () => {
    try {
      const data = await specialistService.fetchSpecialists();
      setSpecialists(data);
    } catch (error) {
      console.error('Failed to load specialists', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0 flex flex-col h-full">
      {/* Mini Calendar Title */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CalendarIcon size={18} className="text-blue-600" />
          Filtros
        </h2>
      </div>

      <div className="p-4">
        {/* Simple Date Picker Trigger */}
        <label className="block text-sm font-medium text-gray-700 mb-2">Ir para data</label>
        <input
          type="date"
          className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
          value={currentDate.toISOString().split('T')[0]}
          onChange={(e) => onDateChange(new Date(e.target.value))}
        />
      </div>

      {/* Specialist Filters */}
      <div className="px-4 py-2 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
          <Filter size={12} />
          Especialistas / Agendas
        </h3>

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-4">Carregando...</div>
        ) : specialists.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">Nenhum especialista encontrado</div>
        ) : (
          <div className="space-y-2">
            {specialists.map(spec => {
              const isSelected = selectedSpecialists.includes(spec.id);
              return (
                <label key={spec.id} className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSpecialist(spec.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center flex-1">
                    <img src={spec.avatarUrl} alt="" className="w-6 h-6 rounded-full mr-2 bg-gray-200 object-cover" />
                    <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                      {spec.name.split(' ')[0]} <span className="text-xs text-gray-400">({spec.specialty})</span>
                    </span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${spec.color.split(' ')[0].replace('bg-', 'bg-')}`}></div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-400">
          Google Calendar Sync: <span className="text-green-600 font-medium">Ativo</span>
        </p>
      </div>
    </div>
  );
};
