import React, { useState } from 'react';
import { SPECIALISTS } from '../constants';
import { Calendar, Check, Users } from 'lucide-react';

export const Agenda: React.FC = () => {
  // Default to the specific email requested, or empty if not found
  const DEFAULT_EMAIL = 'open.evertonai@gmail.com';

  // State to track selected specialist emails
  const [selectedEmails, setSelectedEmails] = useState<string[]>(() => {
    // Check if the default email exists in our specialists list
    const defaultExists = SPECIALISTS.some(s => s.email === DEFAULT_EMAIL);
    return defaultExists ? [DEFAULT_EMAIL] : [];
  });

  const toggleSpecialist = (email: string) => {
    setSelectedEmails(prev => {
      if (prev.includes(email)) {
        return prev.filter(e => e !== email);
      } else {
        return [...prev, email];
      }
    });
  };

  // Construct the aggregated Google Calendar URL
  const getCalendarUrl = () => {
    const baseUrl = "https://calendar.google.com/calendar/embed";
    const params = new URLSearchParams();

    // Core parameters
    params.append('ctz', 'America/Sao_Paulo');
    params.append('showTitle', '0');
    params.append('showNav', '1');
    params.append('showDate', '1');
    params.append('showPrint', '0');
    params.append('showTabs', '1');
    params.append('showCalendars', '0');
    params.append('showTz', '0');
    params.append('height', '600');
    params.append('wkst', '2'); // Start week on Monday
    params.append('bgcolor', '#FFFFFF');

    // Add each selected source
    // Note: We construct the src parameters manually because URLSearchParams might encode them differently than GCal expects for multiple keys
    let url = `${baseUrl}?${params.toString()}`;

    selectedEmails.forEach((email, index) => {
      // Find the specialist to get their color if possible (optional enhancement)
      const specialist = SPECIALISTS.find(s => s.email === email);
      // Map tailwind colors to hex roughly if needed, or let Google assign default
      // Ideally we would pass &color=%23HEXCODE

      url += `&src=${encodeURIComponent(email)}`;

      // Attempt to assign distinct colors based on index if we wanted, 
      // but GCal embeds usually handle their own coloring unless enforced.
    });

    return url;
  };

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">

      {/* Sidebar Controls */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            Minhas Agendas
          </h2>
          <p className="text-xs text-gray-500 mt-1">Selecione para visualizar</p>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {SPECIALISTS.filter(s => !!s.email).map((specialist) => {
            const isSelected = selectedEmails.includes(specialist.email!);
            // Extract color class logic if needed, simplify for UI

            return (
              <button
                key={specialist.id}
                onClick={() => toggleSpecialist(specialist.email!)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${isSelected
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${specialist.color.split(' ')[0]} ${specialist.color.split(' ')[1]}`}>
                    {specialist.name.charAt(0)}
                  </div>
                  <div className="text-left truncate">
                    <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                      {specialist.name}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{specialist.specialty}</p>
                  </div>
                </div>

                {isSelected && (
                  <div className="text-blue-600">
                    <Check size={16} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Calendar View */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {selectedEmails.length > 0 ? (
          <div className="flex-1 w-full h-full p-4">
            <div className="w-full h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <iframe
                key={selectedEmails.join(',')} // Force re-render when selection changes to ensure update
                src={getCalendarUrl()}
                style={{ border: 0 }}
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                title="Agenda Combinada"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Calendar size={64} className="opacity-20 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Nenhuma agenda selecionada</h3>
            <p className="text-sm">Selecione um ou mais profissionais ao lado.</p>
          </div>
        )}
      </main>
    </div>
  );
};
