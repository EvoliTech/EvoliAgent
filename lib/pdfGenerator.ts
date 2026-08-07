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
