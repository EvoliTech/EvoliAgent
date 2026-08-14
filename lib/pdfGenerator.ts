import jsPDF from 'jspdf';
import { Evolucao } from '../services/evolutionService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PatientInfo {
  name: string;
  cpf?: string;
  phone?: string;
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
  doc.text(profName || 'Dentista Responsável', leftMargin, y + 5);
  doc.text('CRO SP 12345', leftMargin, y + 9);
  
  // Draw Logo if exists
  const logoUrl = company.configuracoes?.logo_url;
  if (logoUrl) {
      const base64Logo = await fetchImageAsBase64(logoUrl);
      if (base64Logo) {
          // Add image to top right. Approximate size 35x20
          try {
             doc.addImage(base64Logo, 'PNG', rightMargin - 35, y - 5, 35, 20, '', 'FAST');
          } catch(e) {
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
  
  doc.text(`Endereço: `, leftMargin + 3, y + 15);
  doc.line(leftMargin + 3, y + 17, rightMargin - 3, y + 17);

  y += 25;

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
  const upperTeeth = [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28];
  const lowerTeeth = [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38];
  const allTeeth = [...upperTeeth, ...lowerTeeth];
  
  const toothImages: Record<number, string | null> = {};
  await Promise.all(allTeeth.map(async (tooth) => {
     // Fetch from same origin
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
         // Draw tooth image
         if (toothImages[tooth]) {
             doc.addImage(toothImages[tooth]!, 'PNG', startX, startY, toothWidth, toothHeight, `tooth_${tooth}`, 'FAST');
         } else {
             // Fallback box
             doc.setDrawColor(150, 150, 150);
             doc.setLineWidth(0.2);
             doc.rect(startX, startY, toothWidth, toothHeight);
         }
         
         // Number
         doc.setFontSize(6);
         doc.setTextColor(100, 100, 100);
         // Position number above for upper, below for lower
         const numY = prefix === 'Upper' ? startY + toothHeight + 3 : startY - 2;
         doc.text(tooth.toString(), startX + toothWidth/2, numY, { align: 'center' });
         
         // Highlight if in budget
         const isMarked = budget.treatments?.some((t: any) => t.dente == tooth.toString());
         if (isMarked) {
             // Draw an orange/highlight circle or box over the tooth to mark it
             doc.setDrawColor(249, 115, 22); // Tailwind orange-500
             doc.setLineWidth(0.6);
             doc.roundedRect(startX - 0.5, startY - 0.5, toothWidth + 1, toothHeight + 1, 1, 1, 'S');
             // Also semi-transparent fill if possible? jsPDF doesn't do transparency easily on rects, so just stroke
         }
         startX += toothWidth + spacing;
      });
  };
  
  drawTeethRow(upperTeeth, y + 8, 'Upper');
  drawTeethRow(lowerTeeth, y + 40, 'Lower');

  y += odontogramHeight + 5;

  // Treatments Table
  const tableHeight = 110;
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
  for(let i = 1; i <= 13; i++) {
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
  doc.text('TOTAL', rightMargin - 45, totalY);
  
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
  
  doc.text(company.endereco || 'R. das Vistudes, 578 - Sala 5\nRibeirão Pires - SP - 25874-365', leftMargin, y);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Tel. ${company.telefoneWhatsapp || '2547-2147'}`, leftMargin, y + 10);
  
  doc.setFont('helvetica', 'normal');
  doc.text(company.email || 'contato@clinica.com.br', rightMargin, y + 5, { align: 'right' });
  doc.text('www.clinica.com.br', rightMargin, y, { align: 'right' });

  return doc.output('blob');
};
