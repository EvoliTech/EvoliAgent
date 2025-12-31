import React, { useEffect, useState } from 'react';
import { Users, Calendar, Clock, ArrowUpRight, ArrowRight, Loader2 } from 'lucide-react';
import { patientService } from '../services/patientService';
import { googleCalendarService } from '../services/googleCalendarService';
import { Patient, PageType } from '../types';

interface DashboardProps {
  onNavigate?: (page: PageType) => void;
}

const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
        <p className="text-xs text-gray-400 mt-1 flex items-center">
          {subtitle && <span className="text-green-600 font-medium flex items-center mr-1"><ArrowUpRight size={12} /> {subtitle}</span>}
          {subtitle && 'vs mês anterior'}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    tomorrowAppointments: 0,
    recentPatients: 0
  });
  const [monthlyChartData, setMonthlyChartData] = useState<{ label: string, visits: number }[]>([]);
  const [insuranceChartData, setInsuranceChartData] = useState<{ name: string, value: number, count: number, color: string }[]>([]);
  const [recentPatientsList, setRecentPatientsList] = useState<Patient[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // --- 1. PATIENTS DATA ---
      const patients = await patientService.fetchPatients();

      // Total
      const totalPatients = patients.length;

      // Recent (last 2 days)
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0); // Start of that day

      const recentCount = patients.filter(p => {
        if (!p.createdAt) return false;
        return p.createdAt >= twoDaysAgo;
      }).length;

      // Insurance Distribution
      const planCounts: Record<string, number> = {
        'Unimed': 0, 'Amil': 0, 'Bradesco': 0, 'Particular': 0, 'Outros': 0
      };

      patients.forEach(p => {
        const plan = p.plano || 'Outros';
        if (['Unimed', 'Amil', 'Bradesco', 'Particular'].includes(plan)) {
          planCounts[plan]++;
        } else {
          planCounts['Outros']++;
        }
      });

      const totalWithPlan = patients.length || 1; // Avoid divide by zero
      const insuranceData = [
        { name: 'Unimed', value: Math.round((planCounts['Unimed'] / totalWithPlan) * 100), count: planCounts['Unimed'], color: '#3b82f6' }, // Blue
        { name: 'Amil', value: Math.round((planCounts['Amil'] / totalWithPlan) * 100), count: planCounts['Amil'], color: '#ec4899' }, // Pink
        { name: 'Bradesco', value: Math.round((planCounts['Bradesco'] / totalWithPlan) * 100), count: planCounts['Bradesco'], color: '#8b5cf6' }, // Violet
        { name: 'Particular', value: Math.round((planCounts['Particular'] / totalWithPlan) * 100), count: planCounts['Particular'], color: '#10b981' }, // Emerald
        { name: 'Outros', value: Math.round((planCounts['Outros'] / totalWithPlan) * 100), count: planCounts['Outros'], color: '#f59e0b' } // Amber
      ].sort((a, b) => b.value - a.value);

      // Recent List (Top 5)
      setRecentPatientsList(patients.slice(0, 5));

      // --- 2. APPOINTMENTS DATA (Google Calendar) ---
      const DEFAULT_EMAIL = 'open.evertonai@gmail.com';
      const calendars = await googleCalendarService.listCalendars(DEFAULT_EMAIL);
      const calendarIds = calendars.map(c => c.id);

      const now = new Date();

      // Ranges
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

      const tomStart = new Date(now); tomStart.setDate(tomStart.getDate() + 1); tomStart.setHours(0, 0, 0, 0);
      const tomEnd = new Date(now); tomEnd.setDate(tomEnd.getDate() + 1); tomEnd.setHours(23, 59, 59, 999);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      let todayCount = 0;
      let tomCount = 0;
      const dayCounts: Record<number, number> = {};

      // Initialize all days of month with 0
      const daysInMonth = monthEnd.getDate();
      for (let i = 1; i <= daysInMonth; i++) dayCounts[i] = 0;

      // Fetch in parallel for all calendars
      await Promise.all(calendarIds.map(async (calId) => {
        // We use the connected email
        const [todayEvents, tomEvents, monthEvents] = await Promise.all([
          googleCalendarService.listEvents(DEFAULT_EMAIL, todayStart, todayEnd, calId),
          googleCalendarService.listEvents(DEFAULT_EMAIL, tomStart, tomEnd, calId),
          googleCalendarService.listEvents(DEFAULT_EMAIL, monthStart, monthEnd, calId)
        ]);

        todayCount += todayEvents.length;
        tomCount += tomEvents.length;

        monthEvents.forEach(e => {
          const dateStr = e.start.dateTime || e.start.date;
          if (dateStr) {
            const d = new Date(dateStr);
            const day = d.getDate();
            if (dayCounts[day] !== undefined) dayCounts[day]++;
          }
        });
      }));

      // Format Chart Data
      const chartData = Object.keys(dayCounts).map(day => ({
        label: day,
        visits: dayCounts[parseInt(day)]
      }));

      setStats({
        totalPatients,
        recentPatients: recentCount,
        todayAppointments: todayCount,
        tomorrowAppointments: tomCount
      });

      setMonthlyChartData(chartData);
      setInsuranceChartData(insuranceData);

    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

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
          value={stats.totalPatients}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="Agendamentos Hoje"
          value={stats.todayAppointments}
          icon={Calendar}
          color="bg-emerald-500"
        />
        <StatCard
          title="Agendamentos Amanhã"
          value={stats.tomorrowAppointments}
          icon={Clock}
          color="bg-violet-500"
        />
        <StatCard
          title="Pacientes Recentes (2 dias)"
          value={stats.recentPatients}
          icon={Users}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Chart Section */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Consultas no Mês</h3>
          <div className="h-64 flex items-end justify-between space-x-1 px-2 overflow-x-auto">
            {monthlyChartData.map((item, idx) => {
              const maxVal = Math.max(...monthlyChartData.map(d => d.visits)) || 1;
              const height = (item.visits / maxVal) * 100;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 min-w-[10px] group cursor-pointer">
                  <div className="relative w-full flex justify-center items-end h-full">
                    <div
                      className={`w-full max-w-[20px] rounded-t-sm transition-all relative ${item.visits > 0 ? 'bg-blue-200 group-hover:bg-blue-300' : 'bg-gray-50'}`}
                      style={{ height: `${item.visits > 0 ? height : 5}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs py-1 px-2 rounded shadow transition-opacity z-10 whitespace-nowrap">
                        {item.visits} consultas
                      </div>
                    </div>
                  </div>
                  {/* Show label only for specific intervals to avoid clutter */}
                  <span className="text-[10px] text-gray-400 mt-2 font-medium">
                    {(idx + 1) % 5 === 0 || idx === 0 ? item.label : ''}
                  </span>
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
              {/* Donut Chart */}
              <div className="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4.5" />
                  {insuranceChartData.map((item, idx) => {
                    const previousTotal = insuranceChartData.slice(0, idx).reduce((acc, curr) => acc + curr.value, 0);
                    return (
                      <path
                        key={item.name}
                        stroke={item.color}
                        strokeDasharray={`${item.value}, 100`}
                        strokeDashoffset={`-${previousTotal}`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        strokeWidth="4.5"
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-bold text-gray-800">{stats.totalPatients}</span>
                  <span className="text-[10px] text-gray-500">Total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-2">
                {insuranceChartData.slice(0, 4).map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                      <span className="text-gray-600 truncate max-w-[80px]" title={item.name}>{item.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Patients List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Pacientes Recentes</h3>
              <button
                onClick={() => onNavigate?.('patients')}
                className="text-blue-600 text-xs font-medium hover:underline flex items-center"
              >
                Ver todos <ArrowRight size={12} className="ml-1" />
              </button>
            </div>
            <div className="space-y-4">
              {recentPatientsList.length > 0 ? recentPatientsList.map(patient => (
                <div key={patient.id} className="flex items-center justify-between pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 uppercase">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{patient.name}</p>
                      <p className="text-xs text-gray-500">{patient.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium border ${patient.status === 'Ativo' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {patient.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {patient.createdAt ? patient.createdAt.toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-gray-500 text-center py-4">Nenhum paciente recente</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
