import React, { useState, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';
import { arquivoService, ArquivoPaciente } from '../services/arquivoService';
import { patientService } from '../services/patientService';
import { Folder, Image as ImageIcon, ChevronLeft, Download, Loader2, Search, X } from 'lucide-react';

interface PatientFolder {
  patientId: number;
  patientName: string;
  files: ArquivoPaciente[];
}

export const Gallery: React.FC = () => {
  const { empresaId } = useCompany();
  const [folders, setFolders] = useState<PatientFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation State
  const [selectedFolder, setSelectedFolder] = useState<PatientFolder | null>(null);
  
  // Lightbox State
  const [selectedImage, setSelectedImage] = useState<ArquivoPaciente | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!empresaId) return;
      setLoading(true);
      try {
        const [images, patients] = await Promise.all([
          arquivoService.getAllImages(empresaId),
          patientService.fetchPatients(empresaId)
        ]);

        // Create a map for fast patient name lookup
        const patientMap = new Map();
        patients.forEach(p => {
          patientMap.set(Number(p.id), p.name);
        });

        // Group images by patient
        const grouped = new Map<number, ArquivoPaciente[]>();
        images.forEach(img => {
          if (!grouped.has(img.patient_id)) {
            grouped.set(img.patient_id, []);
          }
          grouped.get(img.patient_id)!.push(img);
        });

        // Convert to array of PatientFolder
        const foldersArray: PatientFolder[] = [];
        grouped.forEach((files, patientId) => {
          foldersArray.push({
            patientId,
            patientName: patientMap.get(patientId) || `Paciente Desconhecido (${patientId})`,
            files
          });
        });

        // Sort folders alphabetically by patient name
        foldersArray.sort((a, b) => a.patientName.localeCompare(b.patientName));
        setFolders(foldersArray);

      } catch (error) {
        console.error("Erro ao carregar galeria:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [empresaId]);

  const filteredFolders = folders.filter(f => 
    f.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDownload = async (file: ArquivoPaciente) => {
    try {
      const response = await fetch(file.url_publica);
      if (!response.ok) throw new Error('Erro ao baixar arquivo');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.nome_arquivo || 'imagem.jpg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      alert('Não foi possível fazer o download do arquivo.');
    }
  };

  const renderLightBox = () => {
    if (!selectedImage) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
        <button 
          onClick={() => setSelectedImage(null)}
          className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 p-2 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
        <button 
          onClick={() => handleDownload(selectedImage)}
          className="absolute top-6 right-20 flex items-center gap-2 text-white/70 hover:text-white bg-black/50 px-4 py-2 rounded-full transition-colors font-medium text-sm"
        >
          <Download size={18} />
          <span>Baixar Foto</span>
        </button>
        
        <img 
          src={selectedImage.url_publica} 
          alt={selectedImage.nome_arquivo}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <div className="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm font-medium">
          {selectedImage.nome_arquivo} • {new Date(selectedImage.created_at || new Date()).toLocaleDateString('pt-BR')}
        </div>
      </div>
    );
  };

  const renderFoldersView = () => (
    <div className="animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Galeria de Fotos</h1>
          <p className="text-gray-500 text-sm mt-1">Todas as fotos anexadas nos perfis dos pacientes.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Pesquisar por paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm transition-shadow shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
          <p className="text-gray-500 font-medium">Carregando fotos...</p>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Folder className="text-gray-300 w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Nenhuma pasta encontrada</h3>
          <p className="text-gray-500 max-w-sm">
            {searchQuery 
              ? "Não encontramos nenhum paciente com esse nome na galeria."
              : "As imagens adicionadas na aba 'Arquivos' dos pacientes vão aparecer aqui organizadas por pastas automaticamente."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filteredFolders.map(folder => (
            <button
              key={folder.patientId}
              onClick={() => setSelectedFolder(folder)}
              className="group flex flex-col items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all focus:outline-none focus:ring-4 focus:ring-blue-50"
            >
              <div className="relative mb-4 transform group-hover:scale-105 transition-transform">
                <Folder className="w-16 h-16 text-blue-100 fill-blue-500 drop-shadow-sm" strokeWidth={1.5} />
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full w-6 h-6 flex items-center justify-center shadow-sm border border-gray-100 text-xs font-bold text-gray-600">
                  {folder.files.length}
                </div>
              </div>
              <p className="font-semibold text-gray-800 text-sm text-center leading-tight line-clamp-2 w-full group-hover:text-blue-700 transition-colors">
                {folder.patientName}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderPhotosView = () => {
    if (!selectedFolder) return null;

    return (
      <div className="animate-in slide-in-from-right-4 duration-300">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <button 
            onClick={() => setSelectedFolder(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 font-medium px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <ChevronLeft size={20} />
            Voltar para Pastas
          </button>
          <div className="flex items-center gap-3 pr-4">
            <Folder className="text-blue-500 fill-blue-100" size={24} />
            <h2 className="text-xl font-bold text-gray-800">
              {selectedFolder.patientName}
            </h2>
            <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold ml-2">
              {selectedFolder.files.length} fotos
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {selectedFolder.files.map(file => (
            <div 
              key={file.id} 
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all relative aspect-square cursor-pointer"
              onClick={() => setSelectedImage(file)}
            >
              <img 
                src={file.url_publica} 
                alt={file.nome_arquivo} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                 <p className="text-white text-xs font-medium truncate mb-2">{file.nome_arquivo}</p>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                     className="bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm p-1.5 rounded-lg flex-1 flex items-center justify-center transition-colors"
                     title="Fazer download"
                   >
                     <Download size={14} />
                   </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1920px] mx-auto p-4 md:p-8 font-sans bg-gray-50 min-h-screen">
      {selectedFolder ? renderPhotosView() : renderFoldersView()}
      {renderLightBox()}
    </div>
  );
};
