import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

export function formatBrazilDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const zonedDate = toZonedTime(date, BRAZIL_TIMEZONE);
    return format(zonedDate, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

export function formatBrazilTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const zonedDate = toZonedTime(date, BRAZIL_TIMEZONE);
    return format(zonedDate, 'HH:mm:ss', { locale: ptBR });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
}

export function formatBrazilDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    const zonedDate = toZonedTime(date, BRAZIL_TIMEZONE);
    return format(zonedDate, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}
