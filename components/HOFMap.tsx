import React, { useState, useRef, MouseEvent as ReactMouseEvent } from 'react';
import { Pencil, MousePointer2, Move, Eraser, Circle, ArrowUpRight } from 'lucide-react';

export interface HOFRegion {
  id: string;
  name: string;
  path: string;
}

export type DrawingTool = 'select' | 'point' | 'arrow' | 'freehand' | 'eraser';

export interface DrawingElement {
  id: string;
  type: DrawingTool;
  x: number;
  y: number;
  points?: { x: number; y: number }[];
  endX?: number;
  endY?: number;
  color: string;
  selected?: boolean;
}

interface HOFMapProps {
  gender: 'female' | 'male';
  selectedRegions: string[];
  onRegionToggle: (region: string) => void;
}

// Approximate regions matching the provided reference face.
// ViewBox is 300x450
const regions: HOFRegion[] = [
  { id: 'Região Frontal', name: 'Região Frontal', path: 'M 90 50 L 210 50 L 225 105 L 75 105 Z' },
  { id: 'Têmpora', name: 'Têmpora', path: 'M 45 100 L 65 95 L 60 145 L 35 135 Z' },
  { id: 'Têmpora_R', name: 'Têmpora R', path: 'M 255 100 L 235 95 L 240 145 L 265 135 Z' },
  { id: 'Glabela', name: 'Glabela', path: 'M 130 110 L 170 110 L 160 140 L 140 140 Z' },
  { id: 'Canto dos Olhos', name: 'Canto dos Olhos', path: 'M 40 160 L 65 150 L 75 185 L 50 195 Z' },
  { id: 'Canto dos Olhos_R', name: 'Canto dos Olhos R', path: 'M 260 160 L 235 150 L 225 185 L 250 195 Z' },
  { id: 'Olheiras', name: 'Olheiras', path: 'M 85 160 L 135 170 L 125 195 L 75 185 Z' },
  { id: 'Olheiras_R', name: 'Olheiras R', path: 'M 215 160 L 165 170 L 175 195 L 225 185 Z' },
  { id: 'Malar', name: 'Malar', path: 'M 50 205 L 125 215 L 120 240 L 45 230 Z' },
  { id: 'Malar_R', name: 'Malar R', path: 'M 250 205 L 175 215 L 180 240 L 255 230 Z' },
  { id: 'Bochecha', name: 'Bochecha', path: 'M 65 245 C 90 245, 105 260, 105 270 C 105 285, 90 290, 65 290 C 50 290, 45 275, 45 260 C 45 250, 50 245, 65 245 Z' },
  { id: 'Bochecha_R', name: 'Bochecha R', path: 'M 235 245 C 210 245, 195 260, 195 270 C 195 285, 210 290, 235 290 C 250 290, 255 275, 255 260 C 255 250, 250 245, 235 245 Z' },
  { id: 'Sulco Nasogeniano', name: 'Sulco Nasogeniano', path: 'M 125 250 L 145 250 L 130 300 L 115 300 Z' },
  { id: 'Sulco Nasogeniano_R', name: 'Sulco Nasogeniano R', path: 'M 175 250 L 155 250 L 170 300 L 185 300 Z' },
  { id: 'Nariz', name: 'Nariz', path: 'M 140 145 L 160 145 L 170 235 L 130 235 Z' },
  { id: 'Lábios', name: 'Lábios', path: 'M 115 305 C 150 285, 185 305, 185 315 C 185 325, 150 335, 115 325 C 105 320, 105 310, 115 305 Z' },
  { id: 'Mento', name: 'Mento', path: 'M 125 350 C 150 340, 175 350, 175 365 C 175 380, 150 385, 125 375 C 110 370, 110 355, 125 350 Z' },
  { id: 'Pré Jowl', name: 'Pré Jowl', path: 'M 95 320 L 115 320 L 110 355 L 90 350 Z' },
  { id: 'Pré Jowl_R', name: 'Pré Jowl R', path: 'M 205 320 L 185 320 L 190 355 L 210 350 Z' },
  { id: 'Mandíbula', name: 'Mandíbula', path: 'M 40 265 L 75 310 L 100 335 L 85 350 L 50 315 L 30 280 Z' },
  { id: 'Mandíbula_R', name: 'Mandíbula R', path: 'M 260 265 L 225 310 L 200 335 L 215 350 L 250 315 L 270 280 Z' },
  { id: 'Submental (papada)', name: 'Submental (papada)', path: 'M 85 380 C 150 395, 215 380, 215 390 C 215 405, 150 415, 85 405 C 70 400, 70 385, 85 380 Z' },
  { id: 'Pescoço', name: 'Pescoço', path: 'M 70 415 L 140 405 L 160 405 L 230 415 L 250 450 L 50 450 Z' },
];

export const HOFMap: React.FC<HOFMapProps> = ({ gender, selectedRegions, onRegionToggle }) => {
  const [tool, setTool] = useState<DrawingTool>('select');
  const [drawings, setDrawings] = useState<DrawingElement[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [draggingElement, setDraggingElement] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const getMousePos = (e: ReactMouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const CTM = svgRef.current.getScreenCTM();
    if (!CTM) return { x: 0, y: 0 };
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d
    };
  };

  const handlePointerDown = (e: ReactMouseEvent) => {
    const pos = getMousePos(e);
    
    if (tool === 'point') {
      const newDot: DrawingElement = { id: Date.now().toString(), type: 'point', x: pos.x, y: pos.y, color: '#3b82f6' };
      setDrawings(prev => [...prev, newDot]);
      return;
    }
    
    if (tool === 'arrow') {
      setIsDrawing(true);
      setCurrentDrawing({ id: Date.now().toString(), type: 'arrow', x: pos.x, y: pos.y, endX: pos.x, endY: pos.y, color: '#3b82f6' });
      return;
    }

    if (tool === 'freehand') {
      setIsDrawing(true);
      setCurrentDrawing({ id: Date.now().toString(), type: 'freehand', x: pos.x, y: pos.y, points: [{ x: pos.x, y: pos.y }], color: '#3b82f6' });
      return;
    }
  };

  const handlePointerMove = (e: ReactMouseEvent) => {
    if (draggingElement && tool === 'select') {
       const pos = getMousePos(e);
       setDrawings(prev => prev.map(d => {
         if (d.id === draggingElement) {
           const dx = pos.x - d.x;
           const dy = pos.y - d.y;
           if (d.type === 'freehand') {
             return { ...d, x: pos.x, y: pos.y, points: d.points?.map(p => ({ x: p.x + dx, y: p.y + dy })) };
           }
           if (d.type === 'arrow') {
             return { ...d, x: pos.x, y: pos.y, endX: d.endX! + dx, endY: d.endY! + dy };
           }
           return { ...d, x: pos.x, y: pos.y };
         }
         return d;
       }));
       return;
    }

    if (!isDrawing || !currentDrawing) return;
    const pos = getMousePos(e);

    if (tool === 'arrow') {
      setCurrentDrawing({ ...currentDrawing, endX: pos.x, endY: pos.y });
    } else if (tool === 'freehand') {
      setCurrentDrawing({ ...currentDrawing, points: [...(currentDrawing.points || []), { x: pos.x, y: pos.y }] });
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentDrawing) {
      setDrawings(prev => [...prev, currentDrawing]);
      setIsDrawing(false);
      setCurrentDrawing(null);
    }
    if (draggingElement) {
       setDraggingElement(null);
    }
  };

  const handleElementClick = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'eraser') {
      setDrawings(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleElementDown = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'select') {
      setDraggingElement(id);
    }
  };

  const imageSrc = gender === 'female' ? '/hof-face-mulher.png' : '/hof-homem.png';

  const renderDrawing = (d: DrawingElement) => {
    if (d.type === 'point') {
      return <circle key={d.id} cx={d.x} cy={d.y} r={4} fill={d.color} onPointerDown={(e) => handleElementDown(e, d.id)} onClick={(e) => handleElementClick(e, d.id)} className={tool === 'eraser' ? 'cursor-pointer hover:opacity-50' : tool === 'select' ? 'cursor-move' : ''} />;
    }
    if (d.type === 'arrow' && d.endX && d.endY) {
      const angle = Math.atan2(d.endY - d.y, d.endX - d.x);
      const headlen = 10;
      const x1 = d.endX - headlen * Math.cos(angle - Math.PI / 6);
      const y1 = d.endY - headlen * Math.sin(angle - Math.PI / 6);
      const x2 = d.endX - headlen * Math.cos(angle + Math.PI / 6);
      const y2 = d.endY - headlen * Math.sin(angle + Math.PI / 6);
      
      return (
        <g key={d.id} onPointerDown={(e) => handleElementDown(e, d.id)} onClick={(e) => handleElementClick(e, d.id)} className={tool === 'eraser' ? 'cursor-pointer hover:opacity-50' : tool === 'select' ? 'cursor-move' : ''}>
          <line x1={d.x} y1={d.y} x2={d.endX} y2={d.endY} stroke={d.color} strokeWidth={3} />
          <polygon points={`${d.endX},${d.endY} ${x1},${y1} ${x2},${y2}`} fill={d.color} />
        </g>
      );
    }
    if (d.type === 'freehand' && d.points) {
      const pathData = `M ${d.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
      return <path key={d.id} d={pathData} stroke={d.color} strokeWidth={3} fill="none" onPointerDown={(e) => handleElementDown(e, d.id)} onClick={(e) => handleElementClick(e, d.id)} className={tool === 'eraser' ? 'cursor-pointer hover:opacity-50' : tool === 'select' ? 'cursor-move' : ''} />;
    }
    return null;
  };

  return (
    <div className="flex gap-6 w-full justify-center">
      
      {/* Toolbar */}
      <div className="flex flex-col gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm self-start">
        <button type="button" title="Selecionar/Mover" onClick={() => setTool('select')} className={`p-2.5 rounded-lg transition-colors ${tool === 'select' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
          <MousePointer2 size={20} />
        </button>
        <button type="button" title="Ponto" onClick={() => setTool('point')} className={`p-2.5 rounded-lg transition-colors ${tool === 'point' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Circle size={20} />
        </button>
        <button type="button" title="Seta" onClick={() => setTool('arrow')} className={`p-2.5 rounded-lg transition-colors ${tool === 'arrow' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
          <ArrowUpRight size={20} />
        </button>
        <button type="button" title="Risco Livre" onClick={() => setTool('freehand')} className={`p-2.5 rounded-lg transition-colors ${tool === 'freehand' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Pencil size={20} />
        </button>
        <div className="h-px bg-gray-200 w-full my-1"></div>
        <button type="button" title="Borracha" onClick={() => setTool('eraser')} className={`p-2.5 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:bg-gray-100'}`}>
          <Eraser size={20} />
        </button>
      </div>

      {/* Face Canvas */}
      <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex items-center justify-center min-w-[300px] w-full max-w-[500px]" style={{ touchAction: 'none' }}>
        <svg 
          ref={svgRef}
          viewBox="0 0 300 450" 
          className="w-full h-auto cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Base Image */}
          <image href={imageSrc} x="0" y="0" width="300" height="450" preserveAspectRatio="xMidYMid slice" opacity="0.9" />

          {/* Region Overlays */}
          {regions.map(reg => {
            // Remove _R suffix to match the base region name for state
            const stateName = reg.id.replace('_R', '');
            const isSelected = selectedRegions.includes(stateName);
            return (
              <path
                key={reg.id}
                d={reg.path}
                fill={isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255,255,255,0.01)'}
                stroke={isSelected ? '#3b82f6' : '#cbd5e1'}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                className="cursor-pointer transition-colors hover:fill-blue-500/20"
                onClick={(e) => {
                  if (tool === 'select') {
                    e.stopPropagation();
                    onRegionToggle(stateName);
                  }
                }}
              />
            );
          })}

          {/* Render Drawings */}
          {drawings.map(renderDrawing)}
          {currentDrawing && renderDrawing(currentDrawing)}
        </svg>

        {/* Floating Tools Indicator */}
        <div className="absolute bottom-4 flex gap-4 bg-white/90 backdrop-blur px-5 py-2.5 rounded-full shadow border border-gray-200 pointer-events-none items-center">
           <button type="button" className="flex items-center gap-2 border border-gray-300 px-3 py-1.5 rounded-md text-sm text-gray-700 bg-white">
              <Pencil size={16} className="text-blue-500"/> Desenhar
           </button>
           <button type="button" className="flex items-center gap-2 border border-gray-300 px-3 py-1.5 rounded-md text-sm text-gray-700 bg-white">
              <div className="w-4 h-4 border border-dashed border-gray-400 rounded-sm" /> Região
           </button>
        </div>
      </div>

    </div>
  );
};
