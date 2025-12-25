import React from 'react';
import { Appointment } from '../../types';
import { startOfWeek, daysOfWeek, addDays, isSameDay } from '../../utils';
import { SPECIALISTS } from '../../constants';

interface WeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: (date: Date) => void;
  onEventClick: (appointment: Appointment) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({ 
  currentDate, 
  appointments, 
  onSlotClick, 
  onEventClick 
}) => {
  const weekStart = startOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8 AM to 6 PM

  const getSpecialistColor = (id: string) => {
    return SPECIALISTS.find(s => s.id === id)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex border-b border-gray-200">
        <div className="w-16 border-r border-gray-100 bg-gray-50" /> {/* Time column header */}
        <div className="flex-1 grid grid-cols-7">
          {weekDays.map(date => {
             const isToday = isSameDay(date, new Date());
             return (
              <div key={date.toISOString()} className="py-3 text-center border-r border-gray-100 last:border-0 bg-gray-50">
                <div className="text-xs font-medium text-gray-500 uppercase">{daysOfWeek[date.getDay()]}</div>
                <div className={`mt-1 text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                  {date.getDate()}
                </div>
              </div>
             );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto relative flex">
        {/* Time Labels */}
        <div className="w-16 flex-shrink-0 border-r border-gray-100 bg-white">
          {hours.map(hour => (
            <div key={hour} className="h-20 border-b border-gray-100 text-xs text-gray-400 text-right pr-2 pt-2 relative">
               <span className="-top-3 relative">{hour}:00</span>
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1 grid grid-cols-7 bg-white relative">
           {/* Horizontal Lines for visual guide */}
           <div className="absolute inset-0 z-0 pointer-events-none flex flex-col">
              {hours.map(hour => (
                 <div key={hour} className="h-20 border-b border-gray-100 w-full"></div>
              ))}
           </div>

           {/* Event Columns */}
           {weekDays.map(day => {
             const dayEvents = appointments.filter(apt => isSameDay(apt.start, day));
             
             return (
               <div key={day.toISOString()} className="relative border-r border-gray-100 h-[880px] group z-10">
                 {/* Clickable slots logic is simplified here; essentially clicking anywhere on the column */}
                 {hours.map(hour => (
                    <div 
                      key={hour}
                      className="h-20 w-full hover:bg-blue-50/30 transition-colors cursor-pointer"
                      onClick={() => {
                        const clickDate = new Date(day);
                        clickDate.setHours(hour);
                        onSlotClick(clickDate);
                      }}
                    />
                 ))}

                 {/* Events Render */}
                 {dayEvents.map(event => {
                   const startHour = event.start.getHours();
                   const startMin = event.start.getMinutes();
                   const durationMin = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                   
                   // 8 AM is top 0. Each hour is 80px (h-20).
                   const topOffset = ((startHour - 8) * 80) + ((startMin / 60) * 80);
                   const height = (durationMin / 60) * 80;

                   if (startHour < 8 || startHour > 18) return null; // Out of view logic

                   return (
                     <div
                       key={event.id}
                       onClick={(e) => {
                         e.stopPropagation();
                         onEventClick(event);
                       }}
                       className={`
                         absolute left-1 right-1 rounded p-1 text-xs border-l-4 cursor-pointer shadow-md
                         ${getSpecialistColor(event.specialistId)}
                         hover:opacity-90 transition-opacity z-20
                       `}
                       style={{ top: `${topOffset}px`, height: `${height}px` }}
                     >
                       <div className="font-bold truncate">{event.title}</div>
                       <div className="truncate opacity-75">{event.patientName}</div>
                     </div>
                   );
                 })}
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
};
