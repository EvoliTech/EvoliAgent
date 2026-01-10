import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="text-emerald-500" size={48} />;
            case 'error':
                return <AlertCircle className="text-rose-500" size={48} />;
            case 'warning':
                return <AlertTriangle className="text-amber-500" size={48} />;
            case 'confirm':
                return <Info className="text-blue-500" size={48} />;
            default:
                return <Info className="text-blue-500" size={48} />;
        }
    };

    const getButtonStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100';
            case 'error':
                return 'bg-rose-600 hover:bg-rose-700 shadow-rose-100';
            case 'warning':
                return 'bg-amber-600 hover:bg-amber-700 shadow-amber-100';
            case 'confirm':
                return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
            default:
                return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-white p-8 animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute right-6 top-6 p-2 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-6 bg-slate-50 p-4 rounded-2xl">
                        {getIcon()}
                    </div>

                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 leading-relaxed mb-8">
                        {message}
                    </p>

                    <div className="flex gap-4 w-full">
                        {type === 'confirm' && (
                            <button
                                onClick={onClose}
                                className="flex-1 px-6 py-3.5 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-200 transition-all"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (onConfirm) onConfirm();
                                else onClose();
                            }}
                            className={`flex-1 px-6 py-3.5 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 ${getButtonStyles()}`}
                        >
                            {confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
