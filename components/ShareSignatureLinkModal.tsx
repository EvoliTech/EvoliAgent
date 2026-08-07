import React, { useState } from 'react';
import { X, Copy, Check, MessageCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ShareSignatureLinkModalProps {
  signingUrl: string;
  onClose: () => void;
}

export const ShareSignatureLinkModal: React.FC<ShareSignatureLinkModalProps> = ({ signingUrl, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(signingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Olá! Segue o link para assinatura da sua evolução do tratamento: ${signingUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800 text-lg">Compartilhar link para assinatura</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Compartilhe o link com seu paciente pelo WhatsApp, e-mail ou como ele escolher.
            <br />
            Ao acessar o link, ele poderá assinar o documento.
          </p>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg flex items-center overflow-hidden">
              <input 
                type="text" 
                readOnly 
                value={signingUrl}
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-600 py-2.5 px-3 truncate"
              />
              <button 
                onClick={handleCopy}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors flex items-center gap-2 border-l border-gray-200"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <button 
              onClick={handleWhatsApp}
              className="px-4 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
            >
              <MessageCircle size={16} />
              Enviar pelo WhatsApp
            </button>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 border border-gray-200 rounded-lg bg-white inline-block">
              <QRCodeSVG value={signingUrl} size={100} />
            </div>
            <p className="text-sm text-gray-600 flex-1 pt-1">
              Se preferir, você pode solicitar ao seu paciente que aponte a câmera do celular para o QR code ao lado. Ele será direcionado à página de assinatura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
