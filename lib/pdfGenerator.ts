import jsPDF from 'jspdf';
import { Evolucao } from '../services/evolutionService';
import { DocumentoData } from '../services/documentoService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from './supabase';
import { userService } from '../services/userService';

interface PatientInfo {
  name: string;
  cpf?: string;
  phone?: string;
  endereco?: string;
}

interface CompanyInfo {
  name: string;
  phone?: string;
  email?: string;
}

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to load image:', url, e);
    return null;
  }
};

const createRegionsOverlay = async (regions: string[], imgWidth: number, imgHeight: number): Promise<string | null> => {
  const exactRegionsData: Record<string, { left: number, top: number, width: number, height: number, svgStr: string }[]> = {
    'Região Frontal': [{ left: 121, top: 78, width: 110, height: 36, svgStr: '<path d="M109 35L96.1542 2L55.7137 1L16.7004 2L1 35H109Z" />' }],
    'Glabela': [{ left: 163, top: 118, width: 28, height: 24, svgStr: '<path d="M19.5 23.5H9L1 1H27L19.5 23.5Z" />' }],
    'Têmpora': [
      { left: 103, top: 99, width: 15, height: 29, svgStr: '<ellipse rx="5.10758" ry="14.2254" transform="matrix(0.893394 0.449275 -0.334768 0.942301 7.78525 14.5895)" />' },
      { left: 234, top: 99, width: 15, height: 29, svgStr: '<path d="M12.3257 12.5205C9.51613 5.06048 5.26185 0.172997 2.82354 1.60404C0.385221 3.03508 0.686206 10.2427 3.49581 17.7028C6.30541 25.1629 10.5597 30.0504 12.998 28.6193C15.4363 27.1883 15.1353 19.9806 12.3257 12.5205Z" />' }
    ],
    'Nariz': [{ left: 170, top: 146, width: 18, height: 40, svgStr: '<path d="M11.2222 1H2.77778L1 36.2464L9.44444 39L17 36.2464L11.2222 1Z" />' }],
    'Canto dos Olhos': [
      { left: 101, top: 133, width: 16, height: 25, svgStr: '<path d="M9.5 1H1L1.5 24L15 17.5128L9.5 1Z" />' },
      { left: 236, top: 133, width: 16, height: 25, svgStr: '<path d="M6.10714 1H14L13.5357 23L1 16.7949L6.10714 1Z" />' }
    ],
    'Olheiras': [
      { left: 119, top: 154, width: 45, height: 10, svgStr: '<path d="M1 1C1 1 6.05882 8.50305 21.5515 8.98017C35.4632 9.40861 44 2.75175 44 2.75175" />' },
      { left: 190, top: 150, width: 43, height: 13, svgStr: '<path d="M42 1C42 1 38.221 10.2611 24.1497 12.1555C8 14.3297 1 5 1 5" />' }
    ],
    'Malar': [
      { left: 102, top: 161.5, width: 49, height: 24, svgStr: '<path d="M4 17.5L1 0.5L24.5 6.5L48.5 9.5V23L4 17.5Z" />' },
      { left: 204, top: 160.5, width: 47, height: 25, svgStr: '<path d="M43.1579 18.3778L46 1L23.7368 7.13333L1 10.2V24L43.1579 18.3778Z" />' }
    ],
    'Bochecha': [
      { left: 114.62, top: 186, width: 26, height: 15, svgStr: '<ellipse cx="12.6871" cy="7.85075" rx="11.975" ry="6.38559" transform="rotate(7.27579 12.6871 7.85075)" />' },
      { left: 212.68, top: 186, width: 26, height: 15, svgStr: '<ellipse rx="11.9725" ry="6.38559" transform="matrix(-0.989023 0.14776 0.14776 0.989023 12.785 7.08456)" />' }
    ],
    'Sulco Nasogeniano': [
      { left: 140.74, top: 190, width: 22, height: 27, svgStr: '<path d="M0.742676 25.9291C1.87395 18.6091 6.34904 11.9149 11.6235 6.84001C13.5147 5.02034 15.681 3.46158 17.991 2.21773C18.6323 1.87242 20.2791 1.10299 21 1" />' },
      { left: 193.26, top: 190, width: 22, height: 27, svgStr: '<path d="M21.2573 25.9291C20.126 18.6091 15.651 11.9149 10.3765 6.84001C8.4853 5.02034 6.31897 3.46158 4.00896 2.21773C3.36767 1.87242 1.7209 1.10299 1 1" />' }
    ],
    'Lábios': [
      { left: 149, top: 203, width: 58, height: 14, svgStr: '<path d="M1 13C1.4196 12.4545 2.79639 11.1391 3.5 10.5C5 9.1375 5.95804 8.35547 7.5 7.5C10.5892 5.78615 11.9816 4.60641 14.7387 3.26721C16.4207 2.45028 18.2493 1.92972 20.0311 1.37451C21.4492 0.932659 23.0497 0.650968 24.5379 0.895984C26.8094 1.26994 28.8405 3.21994 31.2302 2.25301C32.0949 1.90314 32.9132 1.369 33.8085 1.10311C35.146 0.705927 36.6433 0.588867 38.0332 0.588867C38.6771 0.588867 40.2381 1.01785 41.2722 1.39594C42.8447 1.97092 44.4139 2.59949 45.9218 3.32792C47.6303 4.15328 49.3261 5.00202 50.9785 5.93484C52.1233 6.58107 53.1374 7.54286 54.1568 8.36677C55.1481 9.16802 56.6832 10.513 57.5 11.5" />' },
      { left: 149, top: 215, width: 58, height: 16, svgStr: '<path d="M1 2C1.50229 2.43197 3.04659 4.02273 3.5 4.5C4.45 5.5 5.52367 6.24922 7 7.5C9.75482 9.83394 13.6181 11.548 17.1388 12.8101C22.1744 14.6153 27.8412 14.906 33.1289 14.3987C35.5359 14.1678 38.1015 14.0261 40.4236 13.3158C43.1325 12.4873 45.5 11 47.8805 9.25023C49.841 7.80921 50.8813 6.55832 52.5167 5.1522C53.9077 3.95624 55.9896 2.51558 57 1" />' }
    ],
    'Pré Jowl': [
      { left: 147, top: 223, width: 2, height: 17, svgStr: '<path d="M1 1V16" />' },
      { left: 206, top: 223, width: 2, height: 17, svgStr: '<path d="M1 1V16" />' }
    ],
    'Mento': [
      { left: 157, top: 240, width: 41, height: 19, svgStr: '<ellipse cx="20.5" cy="9.5" rx="19.5" ry="8.5" />' }
    ],
    'Mandíbula': [
      { left: 108, top: 190.5, width: 43, height: 62, svgStr: '<path d="M1 1.5L15 36.5L28.5 49L41.5 60.5" />' },
      { left: 203.5, top: 190.5, width: 41, height: 61, svgStr: '<path d="M39.5 1.5L27.5 36L14 48.5L1 60" />' }
    ],
    'Submental (papada)': [
      { left: 135, top: 261, width: 87, height: 15, svgStr: '<path d="M1 1.64706C15.4707 9.48915 31.5782 14.1436 45 14C63.6692 13.8003 77.806 5.54504 86 1" />' }
    ],
    'Pescoço': [
      { left: 122, top: 284, width: 22, height: 50, svgStr: '<line x1="21.2662" y1="0.655105" x2="1.06681" y2="48.4986" />' },
      { left: 178.75, top: 286.9, width: 3, height: 53, svgStr: '<line x1="1.25157" y1="1.39141" x2="1.91309" y2="52.3288" />' },
      { left: 211, top: 284, width: 27, height: 50, svgStr: '<line x1="0.674363" y1="1.21269" x2="25.593" y2="49.0903" />' }
    ]
  };

  let svgParts = '';
  regions.forEach(r => {
    const parts = exactRegionsData[r];
    if (parts) {
      parts.forEach(p => {
        svgParts += `<svg x="${p.left}" y="${p.top}" width="${p.width}" height="${p.height}" viewBox="0 0 ${p.width} ${p.height}" fill="none" stroke="black" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${p.svgStr}</svg>`;
      });
    }
  });

  if (!svgParts) return null;

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 364 344" width="${imgWidth * 4}px" height="${imgHeight * 4}px">${svgParts}</svg>`;

  return new Promise((resolve) => {
    const img = new Image();
    const svgBlob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imgWidth * 4;
      canvas.height = imgHeight * 4;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve(null);
      }
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
};

export const generateEvolutionsPdf = (
  patient: PatientInfo,
  company: CompanyInfo,
  evolutions: Evolucao[]
): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Set font
  doc.setFont('helvetica');

  // Date on the right
  doc.setFontSize(10);
  doc.text(format(new Date(), 'dd/MM/yyyy'), pageWidth - 20, y, { align: 'right' });

  // Company info on the left
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name || 'Clínica Odontológica', 20, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  if (company.phone) {
    doc.text(company.phone, 20, y);
    y += 5;
  }
  if (company.email) {
    doc.text(company.email, 20, y);
    y += 5;
  }

  y += 15;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Evoluções do tratamento', pageWidth / 2, y, { align: 'center' });

  y += 15;

  // Patient Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Paciente: `, 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(patient.name, 40, y);
  y += 6;

  if (patient.cpf) {
    doc.setFont('helvetica', 'bold');
    doc.text(`CPF: `, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.cpf, 30, y);
    y += 6;
  }

  if (patient.phone) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Contato: `, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(patient.phone, 40, y);
    y += 6;
  }

  y += 10;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Evolutions
  evolutions.forEach((evo, index) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Evolution text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    // Split text into lines to fit the page
    const splitText = doc.splitTextToSize(evo.texto, pageWidth - 40);
    doc.text(splitText, 20, y);
    y += (splitText.length * 5) + 10;

    // Footer of evolution
    doc.setFontSize(8);
    const dateFormatted = format(new Date(evo.data_evolucao), "EEEE dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    doc.text(`Realizado ${dateFormatted}`, 20, y);
    doc.text(evo.profissional.replace('Dr. ', '').replace('Dra. ', ''), pageWidth - 20, y, { align: 'right' });

    y += 15;
  });

  return doc.output('blob');
};



export const generateBudgetPdf = async (
  patient: PatientInfo,
  company: any,
  budget: any
): Promise<Blob> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Settings
  const sidebarWidth = 15;
  const primaryColor = [37, 99, 235]; // Tailwind blue-600

  // Draw Sidebar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

  let y = 20;
  const leftMargin = sidebarWidth + 10;
  const rightMargin = pageWidth - 10;
  const contentWidth = rightMargin - leftMargin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(company.name || 'Empresa', leftMargin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let profName = budget.profissional || budget.dentista;
  if (!profName && budget.treatments && budget.treatments.length > 0) {
    // Pega o profissional do primeiro tratamento do orçamento
    profName = budget.treatments.find((t: any) => t.profissional)?.profissional;
  }

  let cro = 'CRO Não informado';
  let adminEmail = company.email;

  if (company.id) {
    try {
      const fetchedEmail = await userService.getAdminEmail(company.id);
      if (fetchedEmail) adminEmail = fetchedEmail;

      if (profName) {
        // Extrai só o nome se tiver Dr. / Dra.
        const searchName = profName.replace(/^(Dr\.|Dra\.|Dr|Dra)\s*/i, '').trim();
        const { data: spec } = await supabase
          .from('especialistas')
          .select('cro')
          .eq('IDEmpresa', company.id)
          .ilike('name', `%${searchName}%`)
          .limit(1)
          .maybeSingle();
        if (spec && spec.cro) {
          cro = spec.cro;
        }
      }
    } catch (e) {
      console.error('Error fetching data for PDF:', e);
    }
  }

  doc.text(profName || 'Dentista Responsável', leftMargin, y + 5);
  doc.text(cro, leftMargin, y + 9);

  // Draw Logo if exists
  const logoUrl = company.configuracoes?.logo_url;
  if (logoUrl) {
    const base64Logo = await fetchImageAsBase64(logoUrl);
    if (base64Logo) {
      // Add image to top right. Approximate size 35x20
      try {
        doc.addImage(base64Logo, 'PNG', rightMargin - 35, y - 5, 35, 20, '', 'FAST');
      } catch (e) {
        console.error("Failed to add image to PDF", e);
      }
    }
  }

  y += 25;
  doc.setTextColor(0, 0, 0); // Reset to black

  // Patient Info Box
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(leftMargin, y, contentWidth, 20, 3, 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Paciente: ${patient.name}`, leftMargin + 3, y + 7);
  doc.text(`Fone: ${patient.phone || ''}`, rightMargin - 60, y + 7);
  doc.line(leftMargin + 3, y + 9, rightMargin - 3, y + 9);

  doc.text(`Endereço: ${patient.endereco || ''}`, leftMargin + 3, y + 15);
  doc.line(leftMargin + 3, y + 17, rightMargin - 3, y + 17);

  y += 25;

  const addedHofRegions = Array.from(new Set(budget.treatments?.flatMap((t: any) => t.hofRegions || [])));
  const addedHofDrawings = budget.treatments?.flatMap((t: any) => t.hofDrawings || []) || [];
  const hofGender = budget.treatments?.find((t: any) => t.hofGender)?.hofGender || 'female';
  
  const hasDentalTreatments = budget.treatments?.some((t: any) => t.dente);
  const hasHofTreatments = addedHofRegions.length > 0 || addedHofDrawings.length > 0 || budget.treatments?.some((t: any) => !t.dente && (t.categoria === 'HOF' || (t.treatmentName || '').toLowerCase().includes('harmonização') || (t.treatmentName || '').toLowerCase().includes('toxina')));
  
  let displayOdontogram = hasDentalTreatments;
  let displayHof = hasHofTreatments;
  
  if (!displayOdontogram && !displayHof) {
     displayOdontogram = true; // fallback for general treatments
  }

  if (displayOdontogram) {
      // Odontogram Box
      const odontogramHeight = 65;
      doc.roundedRect(leftMargin, y, contentWidth, odontogramHeight, 3, 3);

      // Draw simple representation of teeth (grid) inside the box
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('S', leftMargin + contentWidth / 2, y + 5, { align: 'center' });
      doc.text('I', leftMargin + contentWidth / 2, y + odontogramHeight - 3, { align: 'center' });
      doc.text('D', leftMargin + 5, y + odontogramHeight / 2);
      doc.text('E', rightMargin - 8, y + odontogramHeight / 2);

      // Load teeth images beforehand
      const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
      const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
      const allTeeth = [...upperTeeth, ...lowerTeeth];

      const toothImages: Record<number, string | null> = {};
      await Promise.all(allTeeth.map(async (tooth) => {
        const origin = window.location.origin;
        const imgBase64 = await fetchImageAsBase64(`${origin}/${tooth}.png`);
        toothImages[tooth] = imgBase64;
      }));

      // Teeth drawing
      const drawTeethRow = (teethIds: number[], startY: number, prefix: string) => {
        const toothWidth = 6.5;
        const toothHeight = 12;
        const spacing = 1.5;
        const totalWidth = teethIds.length * toothWidth + (teethIds.length - 1) * spacing;
        let startX = leftMargin + (contentWidth - totalWidth) / 2;

        teethIds.forEach((tooth) => {
          if (toothImages[tooth]) {
            doc.addImage(toothImages[tooth]!, 'PNG', startX, startY, toothWidth, toothHeight, `tooth_${tooth}`, 'FAST');
          } else {
            doc.setDrawColor(150, 150, 150);
            doc.setLineWidth(0.2);
            doc.rect(startX, startY, toothWidth, toothHeight);
          }

          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          const numY = prefix === 'Upper' ? startY + toothHeight + 3 : startY - 2;
          doc.text(tooth.toString(), startX + toothWidth / 2, numY, { align: 'center' });

          const isMarked = budget.treatments?.some((t: any) => t.dente == tooth.toString());
          if (isMarked) {
            doc.setDrawColor(249, 115, 22);
            doc.setLineWidth(0.6);
            doc.roundedRect(startX - 0.5, startY - 0.5, toothWidth + 1, toothHeight + 1, 1, 1, 'S');
          }
          startX += toothWidth + spacing;
        });
      };

      drawTeethRow(upperTeeth, y + 8, 'Upper');
      drawTeethRow(lowerTeeth, y + 40, 'Lower');

      y += odontogramHeight + 5;
  }

  if (displayHof) {
      const hofHeight = 70;
      doc.roundedRect(leftMargin, y, contentWidth, hofHeight, 3, 3);
      
      const genderImg = hofGender === 'male' ? 'hof-homem.png' : 'hof-face-mulher.png';
      const base64Hof = await fetchImageAsBase64(`${window.location.origin}/${genderImg}`);
      
      const imgWidth = 60; 
      const imgHeight = imgWidth * (344 / 364); 
      
      const imgX = leftMargin + (contentWidth - imgWidth) / 2;
      const imgY = y + 2;

      if (base64Hof) {
          doc.addImage(base64Hof, 'PNG', imgX, imgY, imgWidth, imgHeight, 'hof_base', 'FAST');
      } else {
          doc.setDrawColor(200, 200, 200);
          doc.rect(imgX, imgY, imgWidth, imgHeight);
      }

      const mapX = (origX: number) => imgX + (origX * imgWidth / 364);
      const mapY = (origY: number) => imgY + (origY * imgHeight / 344);

      // Render regions outline overlay
      if (addedHofRegions.length > 0) {
          const overlayBase64 = await createRegionsOverlay(addedHofRegions as string[], imgWidth, imgHeight);
          if (overlayBase64) {
              doc.addImage(overlayBase64, 'PNG', imgX, imgY, imgWidth, imgHeight, 'hof_regions_overlay', 'FAST');
          }
      }

      addedHofDrawings.forEach((d: any) => {
          const hex = d.color || '#3b82f6';
          const r = parseInt(hex.slice(1,3), 16) || 59;
          const g = parseInt(hex.slice(3,5), 16) || 130;
          const b = parseInt(hex.slice(5,7), 16) || 246;
          doc.setDrawColor(r, g, b);
          doc.setFillColor(r, g, b);

          if (d.type === 'point') {
              doc.circle(mapX(d.x), mapY(d.y), 0.6, 'F');
          } else if (d.type === 'freehand' && d.points && d.points.length > 0) {
              doc.setLineWidth(0.5);
              let prevX = mapX(d.points[0].x);
              let prevY = mapY(d.points[0].y);
              for (let i = 1; i < d.points.length; i++) {
                  const currX = mapX(d.points[i].x);
                  const currY = mapY(d.points[i].y);
                  doc.line(prevX, prevY, currX, currY);
                  prevX = currX;
                  prevY = currY;
              }
          } else if (d.type === 'arrow' && d.endX !== undefined && d.endY !== undefined) {
              doc.setLineWidth(0.5);
              doc.line(mapX(d.x), mapY(d.y), mapX(d.endX), mapY(d.endY));
              const angle = Math.atan2(mapY(d.endY) - mapY(d.y), mapX(d.endX) - mapX(d.x));
              const headlen = 1.5;
              const x1 = mapX(d.endX) - headlen * Math.cos(angle - Math.PI / 6);
              const y1 = mapY(d.endY) - headlen * Math.sin(angle - Math.PI / 6);
              const x2 = mapX(d.endX) - headlen * Math.cos(angle + Math.PI / 6);
              const y2 = mapY(d.endY) - headlen * Math.sin(angle + Math.PI / 6);
              doc.triangle(mapX(d.endX), mapY(d.endY), x1, y1, x2, y2, 'F');
          }
      });

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      if (addedHofRegions.length > 0) {
          doc.text(`Regiões marcadas: ${addedHofRegions.join(', ')}`, leftMargin + 5, y + hofHeight - 4);
      } else {
          doc.text(`Espelho HOF`, leftMargin + 5, y + hofHeight - 4);
      }

      y += hofHeight + 5;
  }

  // Treatments Table
  const tableHeight = 110;
  
  // Create a new page if the table will overflow
  if (y + tableHeight > pageHeight - 15) {
     doc.addPage();
     doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
     doc.rect(0, 0, sidebarWidth, pageHeight, 'F');
     y = 20;
  }
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(leftMargin, y, contentWidth, tableHeight, 3, 3);

  // Table Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(leftMargin, y + 8, rightMargin, y + 8);
  doc.line(rightMargin - 40, y, rightMargin - 40, y + tableHeight);

  doc.text('TRATAMENTOS A REALIZAR', leftMargin + (contentWidth - 40) / 2, y + 6, { align: 'center' });
  doc.text('HONORÁRIOS', rightMargin - 20, y + 6, { align: 'center' });

  // Table Rows (Horizontal lines)
  const rowHeight = 7;
  for (let i = 1; i <= 13; i++) {
    const rowY = y + 8 + (i * rowHeight);
    doc.line(leftMargin, rowY, rightMargin, rowY);
  }

  // Fill Treatments
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let currentTratRowY = y + 13;
  budget.treatments?.slice(0, 13).forEach((t: any) => {
    const text = `${t.dente ? `Dente ${t.dente} - ` : ''}${t.treatmentName || t.tratamento || ''}`;
    doc.text(text.substring(0, 50), leftMargin + 2, currentTratRowY);

    const valueFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor || 0);
    doc.text(valueFormatted, rightMargin - 2, currentTratRowY, { align: 'right' });
    currentTratRowY += rowHeight;
  });

  // Total
  const totalY = y + tableHeight - 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TOTAL', rightMargin - 42, totalY, { align: 'right' });

  const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total || 0);
  doc.setTextColor(0, 0, 0);
  doc.text(totalFormatted, rightMargin - 2, totalY, { align: 'right' });

  y += tableHeight + 15;

  // Footer
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(leftMargin + 20, y, rightMargin - 60, y);
  doc.line(rightMargin - 55, y, rightMargin - 40, y);
  doc.line(rightMargin - 35, y, rightMargin - 20, y);
  doc.text(' / ', rightMargin - 57, y);
  doc.text(' / ', rightMargin - 37, y);

  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  const addressText = company.endereco || 'Endereço não informado';
  const splitAddress = doc.splitTextToSize(addressText, 100);
  doc.text(splitAddress, leftMargin, y);

  doc.setFont('helvetica', 'bold');
  doc.text(`Tel. ${company.phone || company.telefoneWhatsapp || 'Não informado'}`, leftMargin, y + (splitAddress.length * 4.5) + 2);

  doc.setFont('helvetica', 'normal');
  doc.text(adminEmail || 'contato@clinica.com.br', rightMargin, y + 5, { align: 'right' });

  return doc.output('blob');
};

export const generateDocumentoPdf = (
  patient: PatientInfo,
  company: any,
  docData: DocumentoData
): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header Company
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(company.name || 'Clínica Odontológica', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 6;
  if (company.phone) {
    doc.text(company.phone, 20, y);
    y += 6;
  }
  
  y += 10;
  
  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(docData.tipo.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Content rendering based on tipo
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const addTextLines = (text: string) => {
      const splitText = doc.splitTextToSize(text || '', pageWidth - 40);
      splitText.forEach((line: string) => {
          if (y > 270) {
              doc.addPage();
              y = 20;
          }
          doc.text(line, 20, y);
          y += 5;
      });
      y += 5;
  };

  const addField = (label: string, value: string) => {
      if (!value) return;
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, y);
      doc.setFont('helvetica', 'normal');
      
      const textOffset = 20 + doc.getTextWidth(`${label}: `);
      const splitText = doc.splitTextToSize(value, pageWidth - textOffset - 20);
      
      splitText.forEach((line: string, i: number) => {
          if (y > 270) {
              doc.addPage();
              y = 20;
          }
          doc.text(line, i === 0 ? textOffset : 20, y);
          y += 5;
      });
  };

  if (docData.tipo === 'Termo de Consentimento') {
      const fd = docData.conteudo;
      addField('Paciente', fd.nomePaciente || patient.name);
      addField('CPF', fd.cpf || patient.cpf);
      addField('Especialista', fd.nomeEspecialista);
      addField('CRO', fd.croEspecialista);
      addField('Período de Tratamento', fd.periodoTratamento);
      
      y += 5;
      addTextLines('Pelo presente termo de consentimento livre e esclarecido, o paciente declara que foi informado sobre o tratamento, seus riscos e cuidados necessários.');
      
      addField('Condições de Saúde', fd.condicoesSaude);
      addField('Cuidados', fd.cuidados);
      addField('Riscos', fd.riscos);
      
  } else if (docData.tipo === 'Contrato') {
      const fd = docData.conteudo;
      addTextLines('DADOS DO CONTRATANTE:');
      addField('Nome', fd.contratante?.nome || patient.name);
      addField('CPF', fd.contratante?.cpf || patient.cpf);
      addField('Endereço', fd.contratante?.endereco);
      
      y += 5;
      addTextLines('DADOS DA CONTRATADA:');
      addField('Nome', fd.contratada?.nome || company.name);
      addField('Endereço', fd.contratada?.endereco);
      
      y += 5;
      addTextLines('CLÁUSULAS E CONDIÇÕES:');
      if (Array.isArray(fd.clausulas)) {
          fd.clausulas.forEach((c: string, idx: number) => {
              addTextLines(`Cláusula ${idx + 1}: ${c.replace(/<[^>]+>/g, '')}`);
          });
      }
      
      addField('Valor Total', `R$ ${fd.valorTotal}`);
      addField('Forma de Pagamento', fd.formaPagamento);
      
  } else if (docData.tipo === 'Receituário') {
      const fd = docData.conteudo;
      if (typeof fd === 'string') {
          addTextLines(fd);
      } else {
          addField('Paciente', fd.nomePaciente || patient.name);
          addField('Prescrição', fd.prescricao);
      }
  } else if (docData.tipo === 'Atestado' || docData.tipo === 'Atestados') {
      const fd = docData.conteudo;
      if (typeof fd === 'string') {
          addTextLines(fd);
      } else {
          addTextLines(`Atesto para os devidos fins que o(a) sr(a) ${fd.nomePaciente || patient.name}, portador(a) do CPF ${fd.cpf || patient.cpf}, esteve sob meus cuidados odontológicos.`);
          addField('Motivo', fd.motivo);
          addField('Período de repouso', fd.repouso);
      }
  } else {
      // Default
      if (typeof docData.conteudo === 'string') {
          addTextLines(docData.conteudo);
      } else {
          addTextLines(JSON.stringify(docData.conteudo, null, 2));
      }
  }
  
  y += 20;
  if (y > 250) { doc.addPage(); y = 40; }
  
  doc.setDrawColor(0,0,0);
  doc.line(pageWidth / 2 - 40, y, pageWidth / 2 + 40, y);
  y += 5;
  doc.text('Assinatura do Paciente', pageWidth / 2, y, { align: 'center' });

  return doc.output('blob');
};
