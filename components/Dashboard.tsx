import React, { useEffect, useState } from 'react';
import { Users, Calendar, Clock, ArrowUpRight, ArrowRight, Loader2 } from 'lucide-react';
import { patientService } from '../services/patientService';
import { googleCalendarService } from '../services/googleCalendarService';
import { supabase } from '../lib/supabase';
import { Patient, PageType } from '../types';
import { useCompany } from '../contexts/CompanyContext';

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
  const { empresaId } = useCompany();
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
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number, y: number, value: number, label: string } | null>(null);

  useEffect(() => {
    if (empresaId) {
      loadDashboardData();
    }
  }, [empresaId]);

  const loadDashboardData = async () => {
    if (!empresaId) return;
    try {
      setLoading(true);

      // --- 1. PATIENTS DATA ---
      const patients = await patientService.fetchPatients(empresaId);
      const totalPatients = patients.length;

      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      twoDaysAgo.setHours(0, 0, 0, 0);

      const recentCount = patients.filter(p => {
        if (!p.createdAt) return false;
        return p.createdAt >= twoDaysAgo;
      }).length;

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

      const totalWithPlan = patients.length || 1;
      const insuranceData = [
        { name: 'Unimed', value: Math.round((planCounts['Unimed'] / totalWithPlan) * 100), count: planCounts['Unimed'], color: '#3b82f6' },
        { name: 'Amil', value: Math.round((planCounts['Amil'] / totalWithPlan) * 100), count: planCounts['Amil'], color: '#ec4899' },
        { name: 'Bradesco', value: Math.round((planCounts['Bradesco'] / totalWithPlan) * 100), count: planCounts['Bradesco'], color: '#8b5cf6' },
        { name: 'Particular', value: Math.round((planCounts['Particular'] / totalWithPlan) * 100), count: planCounts['Particular'], color: '#10b981' },
        { name: 'Outros', value: Math.round((planCounts['Outros'] / totalWithPlan) * 100), count: planCounts['Outros'], color: '#f59e0b' }
      ].sort((a, b) => b.value - a.value);

      setRecentPatientsList(patients.slice(0, 5));

      // --- 2. APPOINTMENTS DATA (Supabase Mirror) ---
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('IDEmpresa', empresaId)
        .gte('data_inicio', monthStart.toISOString())
        .lte('data_inicio', monthEnd.toISOString());

      if (error) throw error;

      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
      const tomStart = new Date(now); tomStart.setDate(tomStart.getDate() + 1); tomStart.setHours(0, 0, 0, 0);
      const tomEnd = new Date(now); tomEnd.setDate(tomEnd.getDate() + 1); tomEnd.setHours(23, 59, 59, 999);

      let todayCount = 0;
      let tomCount = 0;
      const dayCounts: Record<number, number> = {};

      const daysInMonth = monthEnd.getDate();
      for (let i = 1; i <= daysInMonth; i++) dayCounts[i] = 0;

      agendamentos?.forEach(e => {
        const d = new Date(e.data_inicio);
        const day = d.getDate();
        if (dayCounts[day] !== undefined) dayCounts[day]++;

        const time = d.getTime();
        if (time >= todayStart.getTime() && time <= todayEnd.getTime()) todayCount++;
        if (time >= tomStart.getTime() && time <= tomEnd.getTime()) tomCount++;
      });

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
          <h3 className="text-lg font-bold text-gray-900 mb-6">Agendamentos no Mês</h3>
          <div className="h-64 w-full relative">
            <div className="absolute inset-0 flex">
              {/* Y-Axis (Implicit) */}
              <div className="flex flex-col justify-between text-[10px] text-gray-400 py-6 pr-2 h-full text-right w-6">
                {[...Array(6)].map((_, i) => {
                  const maxVal = Math.max(...monthlyChartData.map(d => d.visits)) || 5;
                  const steps = Math.ceil(maxVal / 5) * 5;
                  return <span key={i}>{steps - i * (steps / 5)}</span>;
                })}
              </div>

              {/* Chart Area */}
              <div className="flex-1 relative h-full">
                {monthlyChartData.length > 0 && (() => {
                  const maxVal = Math.max(...monthlyChartData.map(d => d.visits)) || 5;
                  const roundedMax = Math.ceil(maxVal / 5) * 5;
                  const w = 1000;
                  const h = 300;
                  const padding = 20;

                  const points = monthlyChartData.map((d, i) => {
                    const x = (i / (monthlyChartData.length - 1)) * (w - 2 * padding) + padding;
                    const y = h - padding - ((d.visits / roundedMax) * (h - 2 * padding));
                    return { x, y, value: d.visits, label: d.label };
                  });

                  const pointsStr = points.map(p => `${p.x},${p.y}`).join(' ');
                  const areaPoints = `${padding},${h - padding} ${pointsStr} ${w - padding},${h - padding}`;

                  return (
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
                      <defs>
                        <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[...Array(6)].map((_, i) => (
                        <line
                          key={i}
                          x1="0"
                          y1={padding + i * ((h - 2 * padding) / 5)}
                          x2={w}
                          y2={padding + i * ((h - 2 * padding) / 5)}
                          stroke="#f3f4f6"
                          strokeWidth="1"
                        />
                      ))}

                      {/* Area Under Line */}
                      <polygon points={areaPoints} fill="url(#lineFill)" />

                      {/* The Line */}
                      <polyline
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pointsStr}
                      />

                      {/* Interaction Area */}
                      {points.map((p, i) => {
                        const step = (w - 2 * padding) / (points.length - 1);
                        return (
                          <rect
                            key={i}
                            x={p.x - step / 2}
                            y={0}
                            width={step}
                            height={h}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setHoveredPoint(p)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        );
                      })}

                      {/* Highlight Circle */}
                      {hoveredPoint && (
                        <circle
                          cx={hoveredPoint.x}
                          cy={hoveredPoint.y}
                          r="6"
                          fill="#3b82f6"
                          stroke="white"
                          strokeWidth="2"
                        />
                      )}
                    </svg>
                  );
                })()}

                {/* Tooltip */}
                {hoveredPoint && (
                  <div
                    className="absolute bg-gray-900 text-white text-[10px] py-1 px-2 rounded shadow-lg pointer-events-none z-10 -translate-x-1/2 -translate-y-full mb-2"
                    style={{
                      left: `${(hoveredPoint.x / 1000) * 100}%`,
                      top: `${(hoveredPoint.y / 300) * 100}%`,
                      marginTop: '-8px'
                    }}
                  >
                    Dia {hoveredPoint.label}: {hoveredPoint.value}
                  </div>
                )}
              </div>
            </div>

            {/* X-Axis Labels */}
            <div className="absolute bottom-0 left-6 right-0 flex justify-between px-2 text-[10px] text-gray-400">
              {monthlyChartData.filter((_, i) => i === 0 || i === monthlyChartData.length - 1 || (i + 1) % 5 === 0).map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
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
