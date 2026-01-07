import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingModalProps {
    isOpen: boolean;
    message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
    isOpen,
    message = 'Criando...'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in duration-300">
                <div className="flex flex-col items-center space-y-6">
                    {/* Spinner animado */}
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                        </div>
                        {/* Círculo de pulso */}
                        <div className="absolute inset-0 rounded-full bg-blue-400 opacity-20 animate-ping"></div>
                    </div>

                    {/* Mensagem */}
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">{message}</h3>
                        <p className="text-sm text-gray-500">
                            Aguarde enquanto processamos sua solicitação...
                        </p>
                    </div>

                    {/* Barra de progresso animada */}
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-loading-bar"></div>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes loading-bar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 75%;
            margin-left: 0%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }

        .animate-loading-bar {
          animation: loading-bar 2.5s ease-in-out;
        }
      `}</style>
        </div>
    );
};
