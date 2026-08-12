import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { budgetService } from '../services/budgetService';
import { Loader2, Printer, Info } from 'lucide-react';
import { generateBudgetPdf } from '../lib/pdfGenerator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const PublicBudgetView = () => {
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBudget = async () => {
      const pathParts = window.location.pathname.split('/');
      const id = pathParts[pathParts.length - 1];

      if (!id) {
        setError('ID do orçamento não fornecido.');
        setLoading(false);
        return;
      }

      try {
        const data = await budgetService.fetchBudgetById(id);
        if (!data) {
          setError('Orçamento não encontrado.');
        } else {
          setBudget(data);
        }
      } catch (err) {
        setError('Erro ao carregar o orçamento.');
      } finally {
        setLoading(false);
      }
    };

    fetchBudget();
  }, []);

  const handlePrintPdf = () => {
    if (!budget) return;
    
    const patientInfo = {
      name: budget.paciente?.nome || budget.paciente?.nome_completo || 'Paciente',
      cpf: budget.paciente?.cpf,
      phone: budget.paciente?.celular || budget.paciente?.telefone
    };

    const companyInfo = {
      name: budget.empresa?.nome || 'Clínica Odontológica',
      phone: budget.empresa?.telefone,
      email: ''
    };

    const pdfBlob = generateBudgetPdf(patientInfo, companyInfo, budget);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600">{error || 'Orçamento não encontrado.'}</p>
        </div>
      </div>
    );
  }

  const patientName = budget.paciente?.nome || budget.paciente?.nome_completo || 'Paciente';
  const clinicName = budget.empresa?.nome || 'Clínica Odontológica';

  return (
    <div className="min-h-screen bg-gray-50 font-sans py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-8 text-white text-center sm:text-left sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Orçamento Odontológico</h1>
              <p className="text-blue-100">{clinicName}</p>
            </div>
            <div className="mt-4 sm:mt-0 text-right hidden sm:block">
              <p className="text-sm text-blue-100">Data do Orçamento</p>
              <p className="font-semibold">{format(new Date(budget.created_at || budget.date || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* Patient Info */}
            <div className="mb-8 bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Detalhes do Paciente</h3>
              <p className="font-medium text-gray-900 text-lg">{patientName}</p>
              {budget.paciente?.cpf && <p className="text-gray-600 mt-1">CPF: {budget.paciente.cpf}</p>}
            </div>

            {/* Treatments Table */}
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Tratamentos Planejados</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tratamento</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Dente/Face</th>
                    <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {budget.treatments?.map((t: any, index: number) => (
                    <tr key={t.id || index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{t.treatmentName || t.tratamento}</div>
                        {t.profissional && <div className="text-xs text-gray-500 mt-1">{t.profissional}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {t.dente ? `Dente ${t.dente}` : '-'} {t.faces ? `(${t.faces})` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <th scope="row" colSpan={2} className="px-6 py-5 text-right text-sm font-bold text-gray-900 uppercase">
                      Total do Orçamento
                    </th>
                    <td className="px-6 py-5 text-right whitespace-nowrap text-lg font-bold text-blue-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handlePrintPdf}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <Printer size={20} />
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          Gerado por ClínicaSync
        </p>
      </div>
    </div>
  );
};
