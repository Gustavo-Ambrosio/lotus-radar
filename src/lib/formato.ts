const MOEDA = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
});

const DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

export function formatarMoeda(valor: number | null): string {
  if (valor === null || !Number.isFinite(valor)) return 'Valor não informado';
  return MOEDA.format(valor);
}

export function formatarData(iso: string | null): string {
  if (!iso) return 'Data não informada';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'Data não informada' : DATA.format(d);
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : DATA_HORA.format(d);
}

export function formatarPeriodo(inicio: string | null, fim: string | null): string {
  const de = formatarDataHora(inicio);
  const ate = formatarDataHora(fim);
  if (de === '—' && ate === '—') return 'Período de inscrição não informado';
  if (de === '—') return `Até ${ate}`;
  if (ate === '—') return `A partir de ${de}`;
  return `${de} → ${ate}`;
}

export function diasRestantes(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diferenca = d.getTime() - Date.now();
  return Math.ceil(diferenca / 86_400_000);
}

export function horasRestantes(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 3_600_000);
}

export function foiPublicadoRecentemente(iso: string | null, janelaHoras = 168): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const ms = d.getTime();
  return ms <= Date.now() && Date.now() - ms <= janelaHoras * 3_600_000;
}

export function rotuloPrazo(dias: number | null): string {
  if (dias === null) return 'Prazo não informado';
  if (dias < 0) return 'Encerrado';
  if (dias === 0) return 'Encerra hoje';
  if (dias === 1) return '1 dia restante';
  return `${dias} dias restantes`;
}

export type NivelPrazo = 'encerrado' | 'urgente' | 'proximo' | 'normal';

export function nivelPrazo(dias: number | null): NivelPrazo {
  if (dias === null || dias < 0) return 'encerrado';
  if (dias <= 3) return 'urgente';
  if (dias <= 10) return 'proximo';
  return 'normal';
}
