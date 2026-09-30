/**
 * Normalizacao de texto — base de todos os classificadores.
 *
 * Performance: os classificadores chamam `contemPalavra` ~450 vezes por
 * licitacao (uma por palavra-chave de cada categoria). Compilar um RegExp a
 * cada chamada e' o gargalo medido em producao. Aqui compilamos uma vez e
 * memoizamos por palavra, com o resultado preso no `Map` de forma permanente
 * (o vocabulario e' finito e estatico).
 */

export function normalizarTexto(valor: string): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escapar(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Cache de padroes compilados, compartilhado por todo o processo. */
const cache = new Map<string, RegExp>();

/**
 * Casa a palavra inteira no texto ja normalizado. As bordas sao o que impede
 * "ti" de casar com "partida" ou "sou" — comportamento preservado do original.
 */
export function contemPalavra(textoNormalizado: string, palavra: string): boolean {
  const alvo = normalizarTexto(palavra);
  if (!alvo) return false;
  let padrao = cache.get(alvo);
  if (padrao === undefined) {
    padrao = new RegExp(`(^| )${escapar(alvo)}( |$)`, 'i');
    cache.set(alvo, padrao);
  }
  return padrao.test(textoNormalizado);
}

/**
 * Variante tolerante a sufixo: usada para os sinais de leitura direta, onde
 * "bibliotec" precisa casar com "biblioteca", "bibliotecario", "bibliotecas".
 * Nao exige fronteira no fim, apenas no inicio.
 */
const cachePrefixo = new Map<string, RegExp>();

export function contemPrefixo(textoNormalizado: string, palavra: string): boolean {
  const alvo = normalizarTexto(palavra);
  if (!alvo) return false;
  let padrao = cachePrefixo.get(alvo);
  if (padrao === undefined) {
    padrao = new RegExp(`(^| )${escapar(alvo)}`);
    cachePrefixo.set(alvo, padrao);
  }
  return padrao.test(textoNormalizado);
}

export function limparCachePadroes(): void {
  cache.clear();
  cachePrefixo.clear();
}
