
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, RefreshCw, Users, Check, LayoutGrid, List } from 'lucide-react';
import { googleCalendarService, GoogleCalendar, GoogleEvent } from '../services/googleCalendarService';
import { userService } from '../services/userService';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';
import { NewAppointmentModal } from './NewAppointmentModal';

export const Agenda: React.FC = () => {
  // State
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Details Modal State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GoogleEvent | null>(null);
  const [editingEvent, setEditingEvent] = useState<GoogleEvent | undefined>(undefined);

  // Initial Load
  useEffect(() => {
    loadCalendars();
  }, []);

  // Fetch Events when dependencies change
  useEffect(() => {
    if (selectedCalendarIds.length > 0) {
      loadEvents();
    } else {
      setEvents([]);
    }
  }, [currentDate, view, selectedCalendarIds]);

  const loadCalendars = async () => {
    try {
      setLoading(true);
      const email = await userService.getAdminEmail();
      if (!email) {
        console.warn('No admin email found for Google Calendar sync');
        return;
      }
      setAdminEmail(email);

      const calendarList = await googleCalendarService.listCalendars(email);
      setCalendars(calendarList);

      const primary = calendarList.find(c => c.primary);
      if (primary) setSelectedCalendarIds([primary.id]);
      else if (calendarList.length > 0) setSelectedCalendarIds([calendarList[0].id]);
    } catch (error) {
      console.error('Error loading calendars:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    if (!adminEmail) return;
    try {
      setLoading(true);

      // Calculate start/end of view
      const start = new Date(currentDate);
      const end = new Date(currentDate);

      if (view === 'month') {
        start.setDate(1); // 1st of month
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // last of month
      } else {
        // Week
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start.setDate(diff); // Monday
        end.setDate(start.getDate() + 6); // Sunday
      }

      // Fetch for each selected calendar
      const promises = selectedCalendarIds.map(async (calId) => {
        const events = await googleCalendarService.listEvents(adminEmail, start, end, calId);
        return events.map(e => ({ ...e, calendarId: calId }));
      });

      const results = await Promise.all(promises);
      const allEvents = results.flat();
      setEvents(allEvents);

    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    if (!adminEmail) return;
    const { calendarId, id, ...googleEventData } = eventData;

    if (id) {
      // Update
      await googleCalendarService.updateEvent(adminEmail, id, googleEventData, calendarId);
    } else {
      // Create
      await googleCalendarService.createEvent(adminEmail, googleEventData, calendarId);
    }

    // Refresh
    loadEvents();
    setEditingEvent(undefined); // Reset editing state
  };

  const handleEventClick = (event: GoogleEvent) => {
    setSelectedEvent(event);
    setIsDetailsOpen(true);
  };

  const handleEditEvent = (event: GoogleEvent) => {
    setIsDetailsOpen(false);
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (event: GoogleEvent) => {
    if (!adminEmail) return;
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
      try {
        await googleCalendarService.deleteEvent(adminEmail, event.id!, event.calendarId);
        setIsDetailsOpen(false);
        loadEvents();
      } catch (error: any) {
        alert('Erro ao excluir: ' + error.message);
      }
    }
  };

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  // Render Helpers
  const renderMonthGrid = () => {
    // Basic logic to generate 7x6 grid
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0 Sun - 6 Sat
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Adjust for Monday start if needed, but Google Calendar default is Sunday/Monday depends on locale.
    // Print shows Sunday start (Dom Seg Ter...).

    const days = [];
    // Padding
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`pad-${i}`} className="h-24 sm:h-32 border-b border-r bg-gray-50/30"></div>);
    }
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => {
        if (!e.start || !e.start.dateTime) return false;
        return e.start.dateTime.startsWith(dateStr);
      });

      days.push(
        <div key={day} className="h-24 sm:h-32 border-b border-r p-1 transition-colors hover:bg-gray-50 flex flex-col gap-1 relative group">
          <span className={`text-sm font-medium p-1 w-6 h-6 flex items-center justify-center rounded-full ${day === new Date().getDate() && month === new Date().getMonth() ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
            {day}
          </span>

          {/* Events list */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            {dayEvents.map((ev, idx) => (
              <div key={ev.id || idx} onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded truncate cursor-pointer hover:bg-blue-200" title={ev.summary}>
                {ev.start.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} {ev.summary}
              </div>
            ))}
          </div>

          {/* Add on hover (simplified) */}
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100">
            <button onClick={() => { setIsModalOpen(true); /* Pass date context ideally */ }} className="p-1 hover:bg-gray-200 rounded-full text-blue-600">
              <Plus size={14} />
            </button>
          </div>
        </div>
      );
    }

    return days;
  }

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={20} className="stroke-[3]" />
            <span className="font-semibold">Novo</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-1 flex items-center gap-2 shadow-sm mb-4">
              <input type="date" className="w-full border-none text-sm focus:ring-0 text-gray-600" value={currentDate.toISOString().split('T')[0]} onChange={(e) => setCurrentDate(new Date(e.target.value))} />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Especialistas / Agendas</h3>
            <div className="space-y-2">
              {calendars.map(cal => (
                <div key={cal.id} className="flex items-center gap-3 group cursor-pointer" onClick={() => toggleCalendar(cal.id)}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedCalendarIds.includes(cal.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 group-hover:border-blue-400'}`}>
                    {selectedCalendarIds.includes(cal.id) && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-gray-700 truncate">{cal.summary}</span>
                  <span className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: cal.backgroundColor || '#3b82f6' }}></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* Header */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 capitalize">
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h1>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button onClick={() => navigateDate('prev')} className="p-1 hover:bg-white rounded-md text-gray-500 hover:shadow-sm"><ChevronLeft size={20} /></button>
              <button onClick={() => handleToday()} className="px-3 py-1 text-sm font-medium text-gray-700 hover:bg-white rounded-md">Hoje</button>
              <button onClick={() => navigateDate('next')} className="p-1 hover:bg-white rounded-md text-gray-500 hover:shadow-sm"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1">
              <button
                onClick={() => setView('month')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <LayoutGrid size={16} />
                Mês
              </button>
              <button
                onClick={() => setView('week')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <List size={16} />
                Semana
              </button>
            </div>
            <button onClick={() => loadEvents()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 shrink-0">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
            <div key={day} className={`py-3 text-center text-xs font-semibold uppercase tracking-wider ${i === new Date().getDay() ? 'text-blue-600' : 'text-gray-400'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="grid grid-cols-7 auto-rows-fr">
            {renderMonthGrid()}
          </div>
        </div>
      </main>

      <NewAppointmentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(undefined); }}
        onSave={handleCreateEvent}
        calendars={calendars}
        defaultDate={currentDate}
        initialData={editingEvent}
      />

      <AppointmentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        event={selectedEvent}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};
