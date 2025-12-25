import React from 'react';
import { Appointment, Specialist } from '../../types';
import { getDaysInMonth, getFirstDayOfMonth, daysOfWeek, isSameDay } from '../../utils';
import { SPECIALISTS } from '../../constants';

interface MonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: (date: Date) => void;
  onEventClick: (appointment: Appointment) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({ 
  currentDate, 
  appointments, 
  onSlotClick, 
  onEventClick 
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Create array of days to render
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const getSpecialistColor = (id: string) => {
    return SPECIALISTS.find(s => s.id === id)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200">
      {/* Week Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {daysOfWeek.map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
        {days.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className="bg-gray-50/50" />;

          const dayEvents = appointments.filter(apt => isSameDay(apt.start, date));
          const isToday = isSameDay(date, new Date());

          return (
            <div 
              key={date.toISOString()} 
              className={`bg-white min-h-[120px] p-2 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col group`}
              onClick={() => onSlotClick(date)}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 group-hover:text-blue-600'}
                `}>
                  {date.getDate()}
                </span>
              </div>

              <div className="space-y-1 overflow-y-auto scrollbar-hide">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`
                      text-xs px-2 py-1 rounded border-l-2 truncate cursor-pointer shadow-sm
                      ${getSpecialistColor(event.specialistId)}
                    `}
                    title={`${event.title} - ${event.patientName}`}
                  >
                    <span className="font-semibold">{new Date(event.start).getHours()}:{String(new Date(event.start).getMinutes()).padStart(2, '0')}</span> {event.patientName}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
