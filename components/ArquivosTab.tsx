import React, { useState, useEffect, useRef } from 'react';
import {
    Upload,
    Camera,
    Trash2,
    Download,
    Eye,
    X,
    FolderOpen,
    Image as ImageIcon,
    FileText,
    Film,
    Music,
    File,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ZoomIn,
    SwitchCamera,
    RotateCcw,
} from 'lucide-react';
import { arquivoService, ArquivoPaciente } from '../services/arquivoService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getFileCategory = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
};

const FileIcon = ({ mimeType, size = 24 }: { mimeType: string; size?: number }) => {
    const category = getFileCategory(mimeType);
    const props = { size, strokeWidth: 1.5 };
    switch (category) {
        case 'image': return <ImageIcon {...props} className="text-pink-500" />;
        case 'video': return <Film {...props} className="text-purple-500" />;
        case 'audio': return <Music {...props} className="text-indigo-500" />;
        case 'document': return <FileText {...props} className="text-blue-500" />;
        default: return <File {...props} className="text-gray-400" />;
    }
};

const categoryColor = (mimeType: string) => {
    switch (getFileCategory(mimeType)) {
        case 'image': return 'bg-pink-50 border-pink-200';
        case 'video': return 'bg-purple-50 border-purple-200';
        case 'audio': return 'bg-indigo-50 border-indigo-200';
        case 'document': return 'bg-blue-50 border-blue-200';
        default: return 'bg-gray-50 border-gray-200';
    }
};

// ─── Camera Modal ─────────────────────────────────────────────────────────────

interface CameraModalProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [phase, setPhase] = useState<'camera' | 'preview'>('camera');
    const [previewUrl, setPreviewUrl] = useState('');
    const [capturedFile, setCapturedFile] = useState<File | null>(null);
    const [cameraError, setCameraError] = useState('');
    const [cameraCount, setCameraCount] = useState(0);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    const stopStream = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    };

    const startCamera = async (mode: 'user' | 'environment') => {
        stopStream();
        setCameraError('');
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setCameraCount(devices.filter(d => d.kind === 'videoinput').length);

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: mode },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch {
            setCameraError('Não foi possível acessar a câmera. Verifique as permissões.');
        }
    };

    useEffect(() => {
        startCamera(facingMode);
        return () => {
            stopStream();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCapture = () => {
        const video = videoRef.current;
        if (!video) return;

        setCameraError(''); // Limpa qualquer erro anterior

        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || video.clientWidth || 640;
            canvas.height = video.videoHeight || video.clientHeight || 480;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setCameraError('Erro ao iniciar processamento da imagem.');
                return;
            }

            // Desenha o frame no canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(blob => {
                stopStream(); // Desliga a câmera

                if (!blob) {
                    setCameraError('Falha ao gerar o arquivo da imagem. Tente novamente.');
                    return;
                }

                try {
                    let file: File;
                    const fileName = `foto_${Date.now()}.jpg`;

                    try {
                        // Tentativa 1: Jeito moderno (Navegadores atuais)
                        file = new File([blob], fileName, { type: 'image/jpeg' });
                    } catch (e) {
                        // Tentativa 2: Fallback para WebViews e Safari antigo
                        // Transforma o Blob diretamente em um formato aceitável
                        file = blob as any;
                        (file as any).name = fileName;
                        (file as any).lastModified = new Date().getTime();
                    }

                    const url = URL.createObjectURL(blob);

                    setCapturedFile(file);
                    setPreviewUrl(url);
                    setPhase('preview'); // Vai mostrar a foto e o botão verde
                } catch (err) {
                    console.error('Erro ao processar a imagem:', err);
                    setCameraError('Erro interno ao preparar a imagem para envio.');
                }

            }, 'image/jpeg', 0.92);

        } catch (err) {
            console.error("Erro na captura do frame:", err);
            setCameraError('Ocorreu um problema ao tentar capturar a foto.');
        }
    };

    const handleRetake = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setCapturedFile(null);
        setPreviewUrl('');
        setPhase('camera');
        startCamera(facingMode);
    };

    const handleUsarFoto = () => {
        if (!capturedFile) {
            alert('Nenhuma foto capturada. Tente novamente.');
            return;
        }
        onCapture(capturedFile);
    };

    const handleSwitchCamera = () => {
        const next = facingMode === 'environment' ? 'user' : 'environment';
        setFacingMode(next);
        startCamera(next);
    };

    const handleClose = () => {
        stopStream();
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4 animate-in fade-in">
            <div className="relative w-full max-w-xl bg-black rounded-3xl overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-4 pb-2 bg-gradient-to-b from-black/70 to-transparent">
                    <span className="text-white font-semibold text-lg tracking-wide">📸 Câmera</span>
                    <button onClick={handleClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-full transition-all">
                        <X size={22} />
                    </button>
                </div>

                {/* Video / Preview area */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                    {cameraError ? (
                        <div className="flex flex-col items-center gap-3 p-8 text-center">
                            <AlertCircle size={40} className="text-red-400" />
                            <p className="text-white/70 text-sm">{cameraError}</p>
                            <button
                                onClick={() => startCamera(facingMode)}
                                className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition-all"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    ) : phase === 'preview' ? (
                        <img src={previewUrl} alt="Captura" className="w-full h-full object-cover" />
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            {/* Corner frame overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/60 rounded-tl-lg" />
                                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/60 rounded-tr-lg" />
                                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-white/60 rounded-bl-lg" />
                                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-white/60 rounded-br-lg" />
                            </div>
                        </>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 py-6 bg-black">
                    {phase === 'preview' ? (
                        <>
                            <button
                                onClick={handleRetake}
                                className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-all"
                            >
                                <div className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                                    <RotateCcw size={22} />
                                </div>
                                <span className="text-xs">Refazer</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleUsarFoto}
                                className="flex flex-col items-center gap-1 text-white"
                            >
                                <div className="p-5 bg-green-500 hover:bg-green-400 rounded-full shadow-lg shadow-green-500/30 transition-all hover:scale-110">
                                    <CheckCircle2 size={30} />
                                </div>
                                <span className="text-xs font-semibold">Usar foto</span>
                            </button>
                        </>
                    ) : (
                        <>
                            {cameraCount > 1 && (
                                <button
                                    onClick={handleSwitchCamera}
                                    className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-all"
                                >
                                    <div className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                                        <SwitchCamera size={22} />
                                    </div>
                                    <span className="text-xs">Girar</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleCapture}
                                disabled={!!cameraError}
                                className="flex flex-col items-center gap-1 text-white disabled:opacity-40"
                            >
                                <div className="p-1 rounded-full border-4 border-white shadow-xl">
                                    <div className="w-14 h-14 bg-white rounded-full hover:bg-gray-100 transition-all" />
                                </div>
                                <span className="text-xs font-semibold mt-1">Capturar</span>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Preview Modal ────────────────────────────────────────────────────────────

const PreviewModal: React.FC<{ arquivo: ArquivoPaciente; onClose: () => void }> = ({ arquivo, onClose }) => {
    const category = getFileCategory(arquivo.tipo_arquivo);
    return (
        <div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center"
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute -top-10 right-0 text-white/80 hover:text-white p-2 hover: rounded-full transition-all"
                >
                    <X size={24} />
                </button>
                <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] w-full flex flex-col">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <span className="font-semibold text-gray-700 text-sm truncate max-w-xs">{arquivo.nome_arquivo}</span>
                        <span className="text-xs text-gray-400">{formatBytes(arquivo.tamanho_bytes)}</span>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 p-4 min-h-[300px]">
                        {category === 'image' ? (
                            <img
                                src={arquivo.url_publica}
                                alt={arquivo.nome_arquivo}
                                className="max-w-full max-h-full object-contain rounded-lg shadow"
                            />
                        ) : category === 'video' ? (
                            <video
                                src={arquivo.url_publica}
                                controls
                                className="max-w-full max-h-full rounded-lg shadow"
                            />
                        ) : category === 'audio' ? (
                            <div className="flex flex-col items-center gap-4">
                                <Music size={64} className="text-indigo-400" />
                                <audio src={arquivo.url_publica} controls className="w-64" />
                            </div>
                        ) : arquivo.tipo_arquivo === 'application/pdf' ? (
                            <iframe
                                src={arquivo.url_publica}
                                title={arquivo.nome_arquivo}
                                className="w-full h-[60vh] rounded-lg"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-gray-500">
                                <FileIcon mimeType={arquivo.tipo_arquivo} size={64} />
                                <p className="text-sm">Pré-visualização não disponível</p>
                                <a
                                    href={arquivo.url_publica}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                                >
                                    Abrir arquivo
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Upload Progress ──────────────────────────────────────────────────────────

interface UploadItem {
    id: string;
    name: string;
    status: 'uploading' | 'done' | 'error';
    error?: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ArquivosTabProps {
    patient: any;
    empresaId: number;
}

type ViewMode = 'grid' | 'list';
type FilterMode = 'all' | 'image' | 'document' | 'video' | 'audio' | 'other';

export const ArquivosTab: React.FC<ArquivosTabProps> = ({ patient, empresaId }) => {
    const [arquivos, setArquivos] = useState<ArquivoPaciente[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCamera, setShowCamera] = useState(false);
    const [previewArquivo, setPreviewArquivo] = useState<ArquivoPaciente | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadArquivos = async () => {
        try {
            setLoading(true);
            const data = await arquivoService.getArquivosByPatient(empresaId, patient.id);
            setArquivos(data);
        } catch (err) {
            console.error('Erro ao carregar arquivos:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (patient?.id) loadArquivos();
    }, [patient.id]);

    const processFiles = async (files: FileList | File[]) => {
        // Snapshot the array immediately (important for File objects from camera captures)
        const fileArray = Array.from(files);

        // Limite de 48MB por arquivo
        const validFiles = fileArray.filter(f => {
            if (f.size > 48 * 1024 * 1024) {
                alert('Tamanho do arquivo maior que o permitido, caso queira subir esse arquivo contate o suporte - Limite atingido-');
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        const newUploads: UploadItem[] = validFiles.map(f => ({
            id: `${Date.now()}_${Math.random()}`,
            name: f.name,
            status: 'uploading',
        }));
        setUploads(prev => [...prev, ...newUploads]);

        let hasError = false;

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            const uploadId = newUploads[i].id;
            try {
                await arquivoService.uploadArquivo(empresaId, patient.id, file);
                setUploads(prev =>
                    prev.map(u => u.id === uploadId ? { ...u, status: 'done' } : u)
                );
            } catch (err: any) {
                console.error('Erro no upload:', err);
                hasError = true;
                const errMsg = err?.message || JSON.stringify(err) || 'Falha no upload';
                setUploads(prev =>
                    prev.map(u => u.id === uploadId ? { ...u, status: 'error', error: errMsg } : u)
                );
            }
        }

        await loadArquivos();

        if (hasError) {
            // Mantém toasts de erro visíveis por mais tempo
            setTimeout(() => {
                setUploads(prev => prev.filter(u => u.status === 'uploading' || u.status === 'error'));
            }, 6000);
            setTimeout(() => {
                setUploads([]);
            }, 9000);
        } else {
            setTimeout(() => {
                setUploads([]);
            }, 3000);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            processFiles(e.target.files);
            e.target.value = '';
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length) {
            processFiles(e.dataTransfer.files);
        }
    };

    const handleDelete = async (arquivo: ArquivoPaciente) => {
        if (!confirm(`Excluir "${arquivo.nome_arquivo}" permanentemente?`)) return;
        try {
            await arquivoService.deleteArquivo(arquivo);
            await loadArquivos();
        } catch {
            alert('Erro ao excluir arquivo.');
        }
    };

    const filteredArquivos = arquivos.filter(a => {
        if (filter === 'all') return true;
        return getFileCategory(a.tipo_arquivo) === filter;
    });

    const filterLabels: { key: FilterMode; label: string }[] = [
        { key: 'all', label: 'Todos' },
        { key: 'image', label: '🖼 Imagens' },
        { key: 'document', label: '📄 Documentos' },
        { key: 'video', label: '🎬 Vídeos' },
        { key: 'audio', label: '🎵 Áudios' },
    ];

    return (
        <div className="p-6 h-full bg-gray-50/60 rounded-2xl flex flex-col gap-5 animate-in fade-in">

            {/* ── Upload Toasts ── */}
            {uploads.length > 0 && (
                <div className="fixed bottom-6 right-6 z-[150] flex flex-col gap-2">
                    {uploads.map(u => (
                        <div
                            key={u.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium text-white animate-in slide-in-from-right
                                ${u.status === 'uploading' ? 'bg-blue-600' : u.status === 'done' ? 'bg-green-600' : 'bg-red-500'}`}
                        >
                            {u.status === 'uploading' && <Loader2 size={16} className="animate-spin shrink-0" />}
                            {u.status === 'done' && <CheckCircle2 size={16} className="shrink-0" />}
                            {u.status === 'error' && <AlertCircle size={16} className="shrink-0" />}
                            <span className="max-w-[200px] truncate">
                                {u.status === 'uploading' ? `Enviando: ${u.name}` : u.status === 'done' ? `Enviado: ${u.name}` : `Erro: ${u.name}`}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FolderOpen size={22} className="text-blue-500" />
                        Arquivos do Paciente
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {arquivos.length} {arquivos.length === 1 ? 'arquivo' : 'arquivos'} · Máx. 50 MB por arquivo
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowCamera(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-md shadow-purple-200 transition-all hover:scale-[1.03] active:scale-95"
                    >
                        <Camera size={16} />
                        Câmera
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-sm font-semibold shadow-md shadow-blue-200 transition-all hover:scale-[1.03] active:scale-95"
                    >
                        <Upload size={16} />
                        Upload
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        onChange={handleFileInput}
                    />
                </div>
            </div>

            {/* ── Drag & Drop Zone ── */}
            <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl py-8 px-6 flex flex-col items-center gap-3 cursor-pointer transition-all duration-300
                    ${isDragging
                        ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-100'
                        : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
            >
                <div className={`p-4 rounded-2xl transition-all ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <Upload size={28} className={isDragging ? 'text-blue-500' : 'text-gray-400'} />
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-gray-600">
                        {isDragging ? 'Solte para enviar!' : 'Arraste arquivos aqui ou clique para selecionar'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Imagens, PDFs, vídeos, áudios e documentos · Máx. 50 MB
                    </p>
                </div>
            </div>

            {/* ── Filters + View Mode ── */}
            {arquivos.length > 0 && (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {filterLabels.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all
                                    ${filter === f.key
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                            >
                                {f.label}
                                {f.key !== 'all' && (
                                    <span className="ml-1 opacity-70">
                                        ({arquivos.filter(a => getFileCategory(a.tipo_arquivo) === f.key).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Grade"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="0" y="0" width="7" height="7" rx="1.5" />
                                <rect x="9" y="0" width="7" height="7" rx="1.5" />
                                <rect x="0" y="9" width="7" height="7" rx="1.5" />
                                <rect x="9" y="9" width="7" height="7" rx="1.5" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Lista"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="0" y="0" width="16" height="3" rx="1.5" />
                                <rect x="0" y="6.5" width="16" height="3" rx="1.5" />
                                <rect x="0" y="13" width="16" height="3" rx="1.5" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 py-12">
                    <Loader2 size={36} className="animate-spin text-blue-400" />
                    <span className="text-sm">Carregando arquivos...</span>
                </div>
            ) : filteredArquivos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12 text-center">
                    <div className="p-6 bg-gray-100 rounded-full">
                        <FolderOpen size={48} className="text-gray-300" />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-500">
                            {filter !== 'all' ? 'Nenhum arquivo nessa categoria' : 'Nenhum arquivo ainda'}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                            {filter !== 'all' ? 'Tente outro filtro ou faça upload' : 'Use os botões acima para adicionar arquivos'}
                        </p>
                    </div>
                </div>
            ) : viewMode === 'grid' ? (
                // ── Grid View ──
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredArquivos.map(arquivo => {
                        const isImage = getFileCategory(arquivo.tipo_arquivo) === 'image';
                        return (
                            <div
                                key={arquivo.id}
                                className={`group relative border rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 ${categoryColor(arquivo.tipo_arquivo)}`}
                            >
                                {/* Thumbnail */}
                                <div
                                    className="aspect-square flex items-center justify-center bg-white/60"
                                    onClick={() => setPreviewArquivo(arquivo)}
                                >
                                    {isImage ? (
                                        <img
                                            src={arquivo.url_publica}
                                            alt={arquivo.nome_arquivo}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <FileIcon mimeType={arquivo.tipo_arquivo} size={36} />
                                    )}

                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <ZoomIn size={24} className="text-white drop-shadow-md" />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="px-2 py-2 bg-white/80 backdrop-blur-sm">
                                    <p className="text-[11px] font-semibold text-gray-700 truncate">{arquivo.nome_arquivo}</p>
                                    <p className="text-[10px] text-gray-400">{formatBytes(arquivo.tamanho_bytes)}</p>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <a
                                        href={arquivo.url_publica}
                                        download={arquivo.nome_arquivo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow text-gray-600 hover:text-blue-600 transition-colors"
                                        title="Baixar"
                                    >
                                        <Download size={13} />
                                    </a>
                                    <button
                                        onClick={e => { e.stopPropagation(); handleDelete(arquivo); }}
                                        className="p-1.5 bg-white/90 hover:bg-white rounded-lg shadow text-gray-600 hover:text-red-600 transition-colors"
                                        title="Excluir"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // ── List View ──
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-5 py-3 text-left font-semibold text-gray-600 w-10"></th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-600">Nome</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Tipo</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Tamanho</th>
                                <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden lg:table-cell">Data</th>
                                <th className="px-5 py-3 text-center font-semibold text-gray-600">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredArquivos.map(arquivo => (
                                <tr
                                    key={arquivo.id}
                                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                                    onClick={() => setPreviewArquivo(arquivo)}
                                >
                                    <td className="px-5 py-3.5">
                                        <FileIcon mimeType={arquivo.tipo_arquivo} size={20} />
                                    </td>
                                    <td className="px-3 py-3.5">
                                        <span className="font-medium text-gray-700 max-w-[200px] truncate block">{arquivo.nome_arquivo}</span>
                                    </td>
                                    <td className="px-3 py-3.5 text-gray-400 hidden md:table-cell capitalize">
                                        {getFileCategory(arquivo.tipo_arquivo)}
                                    </td>
                                    <td className="px-3 py-3.5 text-gray-400 hidden sm:table-cell">
                                        {formatBytes(arquivo.tamanho_bytes)}
                                    </td>
                                    <td className="px-3 py-3.5 text-gray-400 hidden lg:table-cell text-xs">
                                        {formatDate(arquivo.created_at)}
                                    </td>
                                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => setPreviewArquivo(arquivo)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                title="Visualizar"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <a
                                                href={arquivo.url_publica}
                                                download={arquivo.nome_arquivo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                title="Baixar"
                                            >
                                                <Download size={16} />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(arquivo)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Modals ── */}
            {showCamera && (
                <CameraModal
                    onCapture={file => {
                        console.log('ArquivosTab recebeu file →', file);
                        setShowCamera(false);
                        processFiles([file]);
                    }}
                    onClose={() => setShowCamera(false)}
                />
            )}
            {previewArquivo && (
                <PreviewModal
                    arquivo={previewArquivo}
                    onClose={() => setPreviewArquivo(null)}
                />
            )}
        </div>
    );
};
