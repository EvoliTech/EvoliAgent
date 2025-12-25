import React from 'react';
import { Users, Calendar, Clock, ArrowUpRight, ArrowRight } from 'lucide-react';
import { DASHBOARD_STATS, RECENT_PATIENTS, CHART_DATA_MONTHLY, CHART_DATA_INSURANCE } from '../constants';

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
        <p className="text-xs text-gray-400 mt-1 flex items-center">
          {subtitle && <span className="text-green-600 font-medium flex items-center mr-1"><ArrowUpRight size={12}/> {subtitle}</span>}
          {subtitle && 'vs mês anterior'}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-gray-500">Bem-vindo ao painel de controle da clínica.</p>
        </div>
        <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
           Hoje, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total de Pacientes" 
          value={DASHBOARD_STATS.totalPatients} 
          subtitle="+12%" 
          icon={Users} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Agendamentos Hoje" 
          value={DASHBOARD_STATS.todayAppointments} 
          subtitle="+4" 
          icon={Calendar} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Agendamentos Amanhã" 
          value={DASHBOARD_STATS.tomorrowAppointments} 
          icon={Clock} 
          color="bg-violet-500" 
        />
        <StatCard 
          title="Pacientes Recentes" 
          value={DASHBOARD_STATS.recentPatients} 
          subtitle="+8%" 
          icon={Users} 
          color="bg-orange-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Consultas por Mês</h3>
          <div className="h-64 flex items-end justify-between space-x-2 px-2">
            {CHART_DATA_MONTHLY.map((item, idx) => {
              const maxVal = Math.max(...CHART_DATA_MONTHLY.map(d => d.visits));
              const height = (item.visits / maxVal) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group cursor-pointer">
                  <div className="relative w-full flex justify-center items-end h-full">
                    <div 
                      className="w-full max-w-[40px] bg-blue-100 rounded-t-sm group-hover:bg-blue-200 transition-all relative"
                      style={{ height: `${height}%` }}
                    >
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded shadow transition-opacity">
                         {item.visits}
                       </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 mt-2 font-medium">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insurance Pie Chart & Recent Patients */}
        <div className="space-y-6">
          
          {/* Insurance Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pacientes por Convênio</h3>
            <div className="flex items-center space-x-6">
               {/* Simple CSS Donut Chart */}
               <div className="relative w-32 h-32 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    {/* Background Circle */}
                    <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                    
                    {/* Segments (Simulated for visuals) */}
                    <path className="text-blue-500" strokeDasharray="35, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                    <path className="text-pink-500" strokeDasharray="25, 100" strokeDashoffset="-35" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                    <path className="text-violet-500" strokeDasharray="20, 100" strokeDashoffset="-60" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                    <path className="text-emerald-500" strokeDasharray="20, 100" strokeDashoffset="-80" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                     <span className="text-2xl font-bold text-gray-800">1.2k</span>
                  </div>
               </div>
               
               {/* Legend */}
               <div className="flex-1 space-y-2">
                 {CHART_DATA_INSURANCE.map(item => (
                   <div key={item.name} className="flex items-center justify-between text-sm">
                     <div className="flex items-center">
                       <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                       <span className="text-gray-600">{item.name}</span>
                     </div>
                     <span className="font-semibold text-gray-900">{item.value}%</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Recent Patients List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Pacientes Recentes</h3>
              <button className="text-blue-600 text-xs font-medium hover:underline flex items-center">Ver todos <ArrowRight size={12} className="ml-1"/></button>
            </div>
            <div className="space-y-4">
              {RECENT_PATIENTS.map(patient => (
                <div key={patient.id} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                      {patient.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">{patient.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
