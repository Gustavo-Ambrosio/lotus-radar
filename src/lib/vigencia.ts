const SITUACOES_ENCERRADAS = [
  'anulad',
  'revogad',
  'desert',
  'cancelad',
  'homologad',
  'concluid',
  'encerrad',
  'ratificad',
  'suspens',
];

/**
 * Considera encerrada uma licitação cujo prazo para propostas já passou ou cuja
 * situação oficial indica que não está mais em andamento (anulada, revogada,
 * descreve, concluída etc.). Usado na coleta e no reprocessamento para manter o
 * snapshot apenas com oportunidades "live".
 */
export function estaEncerrada(
  dataEncerramento?: string | null,
  situacao?: string | null,
  agora: number = Date.now(),
): boolean {
  if (dataEncerramento) {
    const instante = new Date(dataEncerramento).getTime();
    if (Number.isFinite(instante) && instante < agora) return true;
  }
  const texto = (situacao ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return SITUACOES_ENCERRADAS.some((padrao) => texto.includes(padrao));
}