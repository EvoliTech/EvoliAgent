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

export const generateBudgetPdf = (
  patient: PatientInfo,
  company: CompanyInfo,
  budget: any
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
  const budgetName = budget.name || budget.nome || 'Plano de Tratamento';
  doc.text(`Orçamento: ${budgetName}`, pageWidth / 2, y, { align: 'center' });

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

  // Treatments Table Header
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Tratamento', 20, y);
  doc.text('Dente/Face', 90, y);
  doc.text('Profissional', 140, y);
  doc.text('Valor', pageWidth - 20, y, { align: 'right' });
  y += 5;
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 5;

  // Treatments
  doc.setFont('helvetica', 'normal');
  budget.treatments?.forEach((t: any) => {
    const treatmentText = t.treatmentName || t.tratamento || 'Desconhecido';
    const splitTreatment = doc.splitTextToSize(treatmentText, 65);
    const textHeight = splitTreatment.length * 5;

    if (y + textHeight > 270) {
      doc.addPage();
      y = 20;
    }

    doc.text(splitTreatment, 20, y);
    doc.text(`Dente ${t.dente || '-'} ${t.faces ? `- ${t.faces}` : ''}`, 90, y);
    
    // Profissional Name Limiting
    const profName = t.profissional || '-';
    const splitProf = doc.splitTextToSize(profName, 45);
    doc.text(splitProf[0], 140, y); // Only show first line of professional to avoid overlap
    
    const valueFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.valor || 0);
    doc.text(valueFormatted, pageWidth - 20, y, { align: 'right' });

    y += Math.max(textHeight + 3, 8); // Move down based on the text height
  });

  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const totalFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.total || 0);
  doc.text(`Total: ${totalFormatted}`, pageWidth - 20, y, { align: 'right' });

  return doc.output('blob');
};
