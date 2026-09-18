export function normalizarTexto(valor: string): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function contemPalavra(textoNormalizado: string, palavra: string): boolean {
  const alvo = normalizarTexto(palavra);
  if (!alvo) return false;
  const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^| )${escapado}( |$)`, 'i').test(textoNormalizado);
}
