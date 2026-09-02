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
  addedHofRegions?: string[];
  onRegionToggle: (region: string) => void;
  drawings: DrawingElement[];
  addedDrawings?: DrawingElement[];
  onDrawingsChange: (drawings: DrawingElement[]) => void;
  scale?: number;
}

const exactRegions: HOFRegionData[] = [
  {
    id: 'Região Frontal', name: 'Região Frontal',
    parts: [
      { left: 121, top: 78, width: 110, height: 36, viewBox: "0 0 110 36", svgContent: <path d="M109 35L96.1542 2L55.7137 1L16.7004 2L1 35H109Z" /> }
    ]
  },
  {
    id: 'Glabela', name: 'Glabela',
    parts: [
      { left: 163, top: 118, width: 28, height: 24, viewBox: "0 0 28 24", svgContent: <path d="M19.5 23.5H9L1 1H27L19.5 23.5Z" /> }
    ]
  },
  {
    id: 'Têmpora', name: 'Têmpora',
    parts: [
      { left: 103, top: 99, width: 15, height: 29, viewBox: "0 0 15 29", svgContent: <ellipse rx="5.10758" ry="14.2254" transform="matrix(0.893394 0.449275 -0.334768 0.942301 7.78525 14.5895)" /> },
      { left: 234, top: 99, width: 15, height: 29, viewBox: "0 0 15 29", svgContent: <path d="M12.3257 12.5205C9.51613 5.06048 5.26185 0.172997 2.82354 1.60404C0.385221 3.03508 0.686206 10.2427 3.49581 17.7028C6.30541 25.1629 10.5597 30.0504 12.998 28.6193C15.4363 27.1883 15.1353 19.9806 12.3257 12.5205Z" /> }
    ]
  },
  {
    id: 'Nariz', name: 'Nariz',
    parts: [
      { left: 170, top: 146, width: 18, height: 40, viewBox: "0 0 18 40", svgContent: <path d="M11.2222 1H2.77778L1 36.2464L9.44444 39L17 36.2464L11.2222 1Z" /> }
    ]
  },
  {
    id: 'Canto dos Olhos', name: 'Canto dos Olhos',
    parts: [
      { left: 101, top: 133, width: 16, height: 25, viewBox: "0 0 16 25", svgContent: <path d="M9.5 1H1L1.5 24L15 17.5128L9.5 1Z" /> },
      { left: 236, top: 133, width: 16, height: 25, viewBox: "0 0 16 25", svgContent: <path d="M6.10714 1H14L13.5357 23L1 16.7949L6.10714 1Z" /> }
    ]
  },
  {
    id: 'Olheiras', name: 'Olheiras',
    parts: [
      { left: 119, top: 154, width: 45, height: 10, viewBox: "0 0 45 10", svgContent: <path d="M1 1C1 1 6.05882 8.50305 21.5515 8.98017C35.4632 9.40861 44 2.75175 44 2.75175" /> },
      { left: 190, top: 150, width: 43, height: 13, viewBox: "0 0 43 13", svgContent: <path d="M42 1C42 1 38.221 10.2611 24.1497 12.1555C8 14.3297 1 5 1 5" /> }
    ]
  },
  {
    id: 'Malar', name: 'Malar',
    parts: [
      { left: 102, top: 161.5, width: 49, height: 24, viewBox: "0 0 49 24", svgContent: <path d="M4 17.5L1 0.5L24.5 6.5L48.5 9.5V23L4 17.5Z" /> },
      { left: 204, top: 160.5, width: 47, height: 25, viewBox: "0 0 47 25", svgContent: <path d="M43.1579 18.3778L46 1L23.7368 7.13333L1 10.2V24L43.1579 18.3778Z" /> }
    ]
  },
  {
    id: 'Bochecha', name: 'Bochecha',
    parts: [
      { left: 114.62, top: 186, width: 26, height: 15, viewBox: "0 0 26 15", svgContent: <ellipse cx="12.6871" cy="7.85075" rx="11.975" ry="6.38559" transform="rotate(7.27579 12.6871 7.85075)" /> },
      { left: 212.68, top: 186, width: 26, height: 15, viewBox: "0 0 26 15", svgContent: <ellipse rx="11.9725" ry="6.38559" transform="matrix(-0.989023 0.14776 0.14776 0.989023 12.785 7.08456)" /> }
    ]
  },
  {
    id: 'Sulco Nasogeniano', name: 'Sulco Nasogeniano',
    parts: [
      { left: 140.74, top: 190, width: 22, height: 27, viewBox: "0 0 22 27", svgContent: <path d="M0.742676 25.9291C1.87395 18.6091 6.34904 11.9149 11.6235 6.84001C13.5147 5.02034 15.681 3.46158 17.991 2.21773C18.6323 1.87242 20.2791 1.10299 21 1" /> },
      { left: 193.26, top: 190, width: 22, height: 27, svgContent: <path d="M21.2573 25.9291C20.126 18.6091 15.651 11.9149 10.3765 6.84001C8.4853 5.02034 6.31897 3.46158 4.00896 2.21773C3.36767 1.87242 1.7209 1.10299 1 1" /> }
    ]
  },
  {
    id: 'Lábios', name: 'Lábios',
    parts: [
      { left: 149, top: 203, width: 58, height: 14, viewBox: "0 0 58 14", svgContent: <path d="M1 13C1.4196 12.4545 2.79639 11.1391 3.5 10.5C5 9.1375 5.95804 8.35547 7.5 7.5C10.5892 5.78615 11.9816 4.60641 14.7387 3.26721C16.4207 2.45028 18.2493 1.92972 20.0311 1.37451C21.4492 0.932659 23.0497 0.650968 24.5379 0.895984C26.8094 1.26994 28.8405 3.21994 31.2302 2.25301C32.0949 1.90314 32.9132 1.369 33.8085 1.10311C35.146 0.705927 36.6433 0.588867 38.0332 0.588867C38.6771 0.588867 40.2381 1.01785 41.2722 1.39594C42.8447 1.97092 44.4139 2.59949 45.9218 3.32792C47.6303 4.15328 49.3261 5.00202 50.9785 5.93484C52.1233 6.58107 53.1374 7.54286 54.1568 8.36677C55.1481 9.16802 56.6832 10.513 57.5 11.5" /> },
      { left: 149, top: 215, width: 58, height: 16, viewBox: "0 0 58 16", svgContent: <path d="M1 2C1.50229 2.43197 3.04659 4.02273 3.5 4.5C4.45 5.5 5.52367 6.24922 7 7.5C9.75482 9.83394 13.6181 11.548 17.1388 12.8101C22.1744 14.6153 27.8412 14.906 33.1289 14.3987C35.5359 14.1678 38.1015 14.0261 40.4236 13.3158C43.1325 12.4873 45.5 11 47.8805 9.25023C49.841 7.80921 50.8813 6.55832 52.5167 5.1522C53.9077 3.95624 55.9896 2.51558 57 1" /> }
    ]
  },
  {
    id: 'Pré Jowl', name: 'Pré Jowl',
    parts: [
      { left: 147, top: 223, width: 2, height: 17, viewBox: "0 0 2 17", svgContent: <path d="M1 1V16" /> },
      { left: 206, top: 223, width: 2, height: 17, viewBox: "0 0 2 17", svgContent: <path d="M1 1V16" /> }
    ]
  },
  {
    id: 'Mento', name: 'Mento',
    parts: [
      { left: 157, top: 240, width: 41, height: 19, viewBox: "0 0 41 19", svgContent: <ellipse cx="20.5" cy="9.5" rx="19.5" ry="8.5" /> }
    ]
  },
  {
    id: 'Mandíbula', name: 'Mandíbula',
    parts: [
      { left: 108, top: 190.5, width: 43, height: 62, viewBox: "0 0 43 62", svgContent: <path d="M1 1.5L15 36.5L28.5 49L41.5 60.5" /> },
      { left: 203.5, top: 190.5, width: 41, height: 61, viewBox: "0 0 41 61", svgContent: <path d="M39.5 1.5L27.5 36L14 48.5L1 60" /> }
    ]
  },
  {
    id: 'Submental (papada)', name: 'Submental (papada)',
    parts: [
      { left: 135, top: 261, width: 87, height: 15, viewBox: "0 0 87 15", svgContent: <path d="M1 1.64706C15.4707 9.48915 31.5782 14.1436 45 14C63.6692 13.8003 77.806 5.54504 86 1" /> }
    ]
  },
  {
    id: 'Pescoço', name: 'Pescoço',
    parts: [
      { left: 122, top: 284, width: 22, height: 50, viewBox: "0 0 22 50", svgContent: <line x1="21.2662" y1="0.655105" x2="1.06681" y2="48.4986" /> },
      { left: 178.75, top: 286.9, width: 3, height: 53, viewBox: "0 0 3 53", svgContent: <line x1="1.25157" y1="1.39141" x2="1.91309" y2="52.3288" /> },
      { left: 211, top: 284, width: 27, height: 50, viewBox: "0 0 27 50", svgContent: <line x1="0.674363" y1="1.21269" x2="25.593" y2="49.0903" /> }
    ]
  }
];

export const HOFMap: React.FC<HOFMapProps> = ({ gender, selectedRegions, addedHofRegions = [], onRegionToggle, drawings, addedDrawings = [], onDrawingsChange, scale = 1 }) => {
  const [tool, setTool] = useState<DrawingTool>('select');
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
      onDrawingsChange([...drawings, newDot]);
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
       const newDrawings = drawings.map(d => {
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
       });
       onDrawingsChange(newDrawings);
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
      onDrawingsChange([...drawings, currentDrawing]);
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
      onDrawingsChange(drawings.filter(d => d.id !== id));
    }
  };

  const handleElementDown = (e: ReactMouseEvent, id: string) => {
    e.stopPropagation();
    if (tool === 'select') {
      setDraggingElement(id);
    }
  };

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

      <div 
         style={{ 
            width: 364 * scale, 
            height: 344 * scale,
            position: 'relative',
            flexShrink: 0
         }}
      >
        <div 
          className="absolute top-0 left-0 select-none pointer-events-none" 
          style={{ 
             width: 364, 
             height: 344, 
             transform: `scale(${scale})`, 
             transformOrigin: 'top left' 
          }}
        >
          <img 
          src={gender === 'female' ? '/hof-face-mulher.png' : '/hof-homem.png'} 
          alt="Rosto HOF" 
          className="w-full h-full object-contain pointer-events-none"
          style={{ WebkitUserDrag: 'none' }}
        />

        <div className="absolute inset-0 z-10 pointer-events-auto">
          {exactRegions.map((region) => {
            const isSelected = selectedRegions.includes(region.id);
            const isAdded = addedHofRegions.includes(region.id);
            
            return (
              <div key={region.id} className="absolute inset-0 pointer-events-none">
                {region.parts.map((part, idx) => (
                  <svg
                    key={`${region.id}-${idx}`}
                    viewBox={part.viewBox}
                    width={part.width}
                    height={part.height}
                    className="absolute cursor-pointer pointer-events-auto transition-colors duration-200"
                    style={{
                      left: part.left,
                      top: part.top,
                      fill: 'transparent',
                      stroke: isSelected || isAdded ? '#000000' : 'rgba(255, 255, 255, 0.9)',
                      strokeWidth: isSelected || isAdded ? 2.5 : 1.3,
                      strokeDasharray: isSelected || isAdded ? 'none' : '3 3',
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (tool === 'select') {
                        onRegionToggle(region.id);
                      }
                    }}
                  >
                    {part.svgContent}
                  </svg>
                ))}
              </div>
            );
          })}
        </div>

        <svg 
          ref={svgRef}
          className="absolute inset-0 w-full h-full cursor-crosshair z-20 pointer-events-none"
          style={{ pointerEvents: tool !== 'select' ? 'auto' : 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {addedDrawings.map(renderDrawing)}
          {drawings.map(renderDrawing)}
          {currentDrawing && renderDrawing(currentDrawing)}
        </svg>

        </div>
      </div>

    </div>
  );
};
