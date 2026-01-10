// Simple date utilities to avoid heavy dependencies for this demo
// In a real production app, date-fns or dayjs is recommended

export const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

export const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day;
  return new Date(result.setDate(diff));
};

export const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
};

export const generateWhatsAppLink = (phone: string, text: string = ''): string => {
  // Clean phone number
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/55${cleanPhone}?text=${encodedText}`;
};

export const getStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const formatWhatsApp = (phone: string | null | undefined): string => {
  if (!phone) return '';

  // Remove sufixo do n8n/whatsapp se existir
  let cleaned = phone.split('@')[0];
  // Remove tudo que não for número
  cleaned = cleaned.replace(/\D/g, '');

  // Se já começar com 55, mantém. Se não, assume brasileiro.
  // Padroniza: 55 + DDD + Numero
  if (cleaned.length < 10) return cleaned; // Curto demais

  let country = '55';
  let ddd = '';
  let number = '';

  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    ddd = cleaned.substring(2, 4);
    number = cleaned.substring(4);
  } else if (cleaned.length >= 10) {
    ddd = cleaned.substring(0, 2);
    number = cleaned.substring(2);
  } else {
    return cleaned;
  }

  // Máscara: 55 (DD) 9XXXX-XXXX ou 55 (DD) XXXX-XXXX
  if (number.length === 9) {
    return `${country} (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
  } else {
    return `${country} (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
  }
};

