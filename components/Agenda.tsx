import React, { useState, useEffect, useCallback } from 'react';
import { CalendarState, Appointment } from '../types';
import { formatDate, addDays } from '../utils';
import { SPECIALISTS } from '../constants';
import { googleCalendarService } from '../services/googleCalendarService';

import { CalendarSidebar } from './Calendar/CalendarSidebar';
import { MonthView } from './Calendar/MonthView';
import { WeekView } from './Calendar/WeekView';
import { Modal } from './ui/Modal';
import { AppointmentForm } from './AppointmentForm';

import { ChevronLeft, ChevronRight, Plus, RefreshCw, LayoutGrid, List } from 'lucide-react';

export const Agenda: React.FC = () => {
  // --- State ---
  const [calendarState, setCalendarState] = useState<CalendarState>({
    currentDate: new Date(),
    view: 'week',
    selectedSpecialistIds: SPECIALISTS.map(s => s.id) // All selected by default
  });
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Partial<Appointment> | undefined>(undefined);

  // --- Effects ---

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    // Fetch a broad range to cover month view
    const start = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth() - 1, 1);
    const end = new Date(calendarState.currentDate.getFullYear(), calendarState.currentDate.getMonth() + 2, 0);
    
    try {
      const data = await googleCalendarService.fetchEvents(start, end);
      setAppointments(data);
    } catch (error) {
      console.error("Failed to sync", error);
    } finally {
      setIsLoading(false);
    }
  }, [calendarState.currentDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // --- Handlers ---

  const handleNavigate = (direction: 'prev' | 'next') => {
    const daysToAdd = calendarState.view === 'month' ? 30 : 7;
    const factor = direction === 'next' ? 1 : -1;
    
    // For proper month navigation
    let newDate = new Date(calendarState.currentDate);
    if (calendarState.view === 'month') {
      newDate.setMonth(newDate.getMonth() + factor);
    } else {
      newDate = addDays(newDate, daysToAdd * factor);
    }
    
    setCalendarState(prev => ({ ...prev, currentDate: newDate }));
  };

  const handleSlotClick = (date: Date) => {
    setEditingAppointment({
      start: date,
      end: new Date(date.getTime() + 30 * 60000), // Default 30 min
      specialistId: calendarState.selectedSpecialistIds[0] || SPECIALISTS[0].id
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (apt: Appointment) => {
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };

  const handleSaveAppointment = async (data: Omit<Appointment, 'id'>) => {
    setIsModalOpen(false);
    setIsLoading(true);
    try {
      if (editingAppointment?.id) {
        await googleCalendarService.updateEvent({ ...data, id: editingAppointment.id } as Appointment);
      } else {
        await googleCalendarService.createEvent(data);
      }
      await fetchAppointments();
    } catch (error) {
      alert("Erro ao salvar agendamento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;
    setIsModalOpen(false);
    setIsLoading(true);
    try {
      await googleCalendarService.deleteEvent(id);
      await fetchAppointments();
    } catch (error) {
       alert("Erro ao excluir");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter appointments for display
  const displayedAppointments = appointments.filter(apt => 
    calendarState.selectedSpecialistIds.includes(apt.specialistId)
  );

  return (
    <div className="flex h-full bg-gray-50 overflow-hidden">
      
      <CalendarSidebar 
        currentDate={calendarState.currentDate}
        onDateChange={(d) => setCalendarState(p => ({ ...p, currentDate: d }))}
        selectedSpecialists={calendarState.selectedSpecialistIds}
        onToggleSpecialist={(id) => {
          setCalendarState(prev => {
             const ids = prev.selectedSpecialistIds;
             return {
               ...prev,
               selectedSpecialistIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
             };
          });
        }}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 h-16 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center space-x-6">
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button onClick={() => handleNavigate('prev')} className="p-1 hover:bg-white hover:shadow rounded-md transition-all text-gray-600">
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 font-medium text-gray-700 min-w-[140px] text-center select-none">
                 {formatDate(calendarState.currentDate)}
              </span>
              <button onClick={() => handleNavigate('next')} className="p-1 hover:bg-white hover:shadow rounded-md transition-all text-gray-600">
                <ChevronRight size={20} />
              </button>
            </div>

            <button 
              onClick={() => setCalendarState(p => ({ ...p, currentDate: new Date() }))}
              className="text-sm font-medium text-gray-500 hover:text-blue-600 px-3 py-1 rounded border border-transparent hover:border-gray-200"
            >
              Hoje
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1 text-sm font-medium">
              <button 
                onClick={() => setCalendarState(p => ({ ...p, view: 'month' }))}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${calendarState.view === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <LayoutGrid size={16} /> Mês
              </button>
              <button 
                onClick={() => setCalendarState(p => ({ ...p, view: 'week' }))}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-all ${calendarState.view === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <List size={16} /> Semana
              </button>
            </div>

            <button 
              onClick={() => fetchAppointments()}
              disabled={isLoading}
              className={`p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-all ${isLoading ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={20} />
            </button>

            <button 
              onClick={() => {
                setEditingAppointment(undefined);
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-md transition-colors font-medium text-sm"
            >
              <Plus size={18} /> Novo
            </button>
          </div>
        </header>

        {/* Main Calendar Area */}
        <div className="flex-1 overflow-hidden p-6 relative">
          {calendarState.view === 'month' ? (
            <MonthView 
              currentDate={calendarState.currentDate}
              appointments={displayedAppointments}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          ) : (
            <WeekView 
              currentDate={calendarState.currentDate}
              appointments={displayedAppointments}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute top-4 right-8 bg-white/90 px-4 py-2 rounded-full shadow-lg border border-blue-100 text-blue-600 text-sm font-medium animate-pulse z-10 flex items-center">
              <RefreshCw size={14} className="mr-2 animate-spin"/> Sincronizando...
            </div>
          )}
        </div>
      </main>

      {/* Appointment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAppointment?.id ? "Editar Agendamento" : "Novo Agendamento"}
      >
        <AppointmentForm 
          initialData={editingAppointment}
          onSubmit={handleSaveAppointment}
          onDelete={handleDeleteAppointment}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

    </div>
  );
}
