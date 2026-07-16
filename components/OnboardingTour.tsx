import React, { useState } from 'react';
import { Joyride, CallBackProps, STATUS, Step, EVENTS, ACTIONS } from 'react-joyride';

interface OnboardingTourProps {
  onTourFinish: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onTourFinish }) => {
  const [run, setRun] = useState(true);

  const baseSteps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content: (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Bem-vindo(a) ao EvoliSync! 🎉</h2>
          <p className="text-gray-600">
            Estamos felizes em ter você aqui. Preparamos um rápido guia de 11 passos para te mostrar as principais funcionalidades do sistema.
          </p>
        </div>
      )
    },
    {
      target: '#tour-dashboard',
      content: 'Visão Geral: Acompanhe os indicadores mais importantes da sua clínica em tempo real.',
    },
    {
      target: '#tour-agenda',
      content: 'Agenda: Gerencie seus compromissos e veja os horários disponíveis de forma fácil.',
    },
    {
      target: '#tour-patients',
      content: 'Pacientes: Acesse o prontuário completo, histórico e dados dos seus pacientes.',
    },
    {
      target: '#tour-financeiro',
      content: 'Financeiro: Tenha o controle total do seu caixa, faturamento e contas a pagar/receber.',
    },
    {
      target: '#tour-inventory',
      content: 'Estoque: Controle seus materiais e produtos, recebendo alertas quando algo estiver acabando.',
    },
    {
      target: '#tour-campaigns',
      content: 'Campanhas: Crie ações de marketing e envie mensagens em massa para seus pacientes.',
    },
    {
      target: '#tour-prosthesis-control',
      content: 'Próteses: Gerencie os pedidos de próteses junto aos laboratórios parceiros.',
    },
    {
      target: '#tour-message-center',
      content: 'Central de Mensagens: Concentre toda a comunicação com seus pacientes em um único lugar.',
    },
    {
      target: '#tour-settings',
      content: 'Configurações: Ajuste preferências da clínica, horários e integrações.',
    },
    {
      target: 'body',
      placement: 'center',
      content: (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Quase lá!</h2>
          <p className="text-gray-600">
            Agora você precisa criar o seu usuário Administrador para começar a utilizar o sistema!
          </p>
        </div>
      ),
    },
  ];

  const steps = baseSteps;

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    // Encerra a tour apenas se for pelo fluxo nativo de finish/skip (garantia)
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onTourFinish();
    }
  };

  // Custom tooltip interceptando os botões de pular e fechar
  const CustomTooltip = ({
    index,
    step,
    backProps,
    primaryProps,
    tooltipProps,
    isLastStep,
  }: any) => {
    return (
      <div {...tooltipProps} className="bg-white p-5 rounded-2xl shadow-xl w-[350px] max-w-full relative text-left border border-gray-100">
        <button 
          onClick={() => {
            setRun(false);
            onTourFinish();
          }}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors p-1"
          aria-label="Fechar"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        
        {step.title && <h3 className="text-lg font-bold mb-2 text-gray-900">{step.title}</h3>}
        <div className="text-gray-600 text-sm mb-6 leading-relaxed">{step.content}</div>
        
        <div className="flex items-center justify-between">
          <button 
             onClick={() => {
               setRun(false);
               onTourFinish();
             }} 
             className="text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors"
          >
            Pular
          </button>
          
          <div className="flex gap-2">
            {index > 0 && (
              <button {...backProps} className="px-3 py-1.5 text-blue-600 font-medium text-sm rounded-lg hover:bg-blue-50 transition-colors">Voltar</button>
            )}
            <button {...primaryProps} className="px-4 py-1.5 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700 transition-colors">
              {isLastStep ? 'Criar Equipe' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>
        {`
          /* Garante que o balão seja clicável */
          .react-joyride__tooltip,
          .__floater__ {
            pointer-events: auto !important;
          }
        `}
      </style>
      
      <Joyride
        steps={steps}
        run={run}
        continuous
        scrollToFirstStep
        showProgress={false}
        spotlightClicks={false}
        callback={handleJoyrideCallback}
        tooltipComponent={CustomTooltip}
        styles={{
          options: {
            primaryColor: '#4f46e5',
            zIndex: 10000,
          }
        }}
      />
    </>
  );
};
