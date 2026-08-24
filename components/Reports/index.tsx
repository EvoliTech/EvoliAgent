import React, { useState } from 'react';
import { CalendarDays, CircleDollarSign, Stethoscope, BarChart2, TrendingUp, Users } from 'lucide-react';
import { DailyReportTab } from './DailyReportTab';
import { FinancialReportTab } from './FinancialReportTab';
import { CommissionsReportTab } from './CommissionsReportTab';
import { ProductivityReportTab } from './ProductivityReportTab';
import { PatientsReportTab } from './PatientsReportTab';

type ReportTab = 'daily' | 'financial' | 'commissions' | 'productivity' | 'patients';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');

  const tabs = [
    { id: 'daily', label: 'Diário do Especialista', icon: CalendarDays, description: 'Agenda, procedimentos e cobranças do dia' },
    { id: 'financial', label: 'Financeiro', icon: CircleDollarSign, description: 'Faturamento, inadimplência e projeções' },
    { id: 'commissions', label: 'Comissões', icon: TrendingUp, description: 'Repasse médico e metas' },
    { id: 'productivity', label: 'Produtividade', icon: Stethoscope, description: 'Tratamentos mais realizados e ocupação' },
    { id: 'patients', label: 'Pacientes / CRM', icon: Users, description: 'Conversão, novos leads e retenção' },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 w-full h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Central de Relatórios
          </h1>
          <p className="text-gray-500 mt-1">Análises estratégicas e operacionais da clínica</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100 overflow-x-auto custom-scrollbar flex-shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
                ${isActive 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
              title={tab.description}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex-1 overflow-auto">
        {activeTab === 'daily' && <DailyReportTab />}
        {activeTab === 'financial' && <FinancialReportTab />}
        {activeTab === 'commissions' && <CommissionsReportTab />}
        {activeTab === 'productivity' && <ProductivityReportTab />}
        {activeTab === 'patients' && <PatientsReportTab />}
      </div>
    </div>
  );
};
