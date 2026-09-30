import { normalizarTexto } from './texto';
import { resolverSegmentoExclusivo } from './segmentos';
import type { Coordenadas } from './geo';
import type { NovaLicitacao } from '../db/schema';
import type { Licitacao } from './tipos';

/**
 * Traducao do formato de transporte (o snapshot JSON que os coletores
 * escrevem) para a linha da tabela `licitacoes`.
 *
 * Fica em `src/lib` e sem I/O de proposito: e' a fronteira entre os coletores
 * e o banco, e o unico lugar onde uma decisao de produto pode gravar dado
 * sujo. `textoBusca` e' calculado aqui — e' o campo que o indice trigram
 * consulta, entao normalizar no momento da escrita e' o que torna a busca
 * possivel no Postgres.
 */

/** Data ISO em `Date`, ou `null` quando ausente/invalida. */
export function paraData(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const instante = new Date(valor).getTime();
  return Number.isFinite(instante) ? new Date(instante) : null;
}

/**
 * Texto indexado para busca: objeto, orgao e municipio normalizados.
 * Espelha o que o filtro de busca do dashboard considerava antes, agora
 * resolvido no servidor.
 */
export function textoBuscaDe(licitacao: Pick<Licitacao, 'objeto' | 'orgao' | 'municipio'>): string {
  return normalizarTexto(`${licitacao.objeto} ${licitacao.orgao} ${licitacao.municipio}`);
}

/**
 * Converte um item do snapshot na linha de insercao. As coordenadas chegam
 * prontas: a resolucao depende da lista de municipios, que e' estado de modulo
 * em `geo.ts` e por isso nao entra numa funcao pura.
 */
export function paraLinha(
  licitacao: Licitacao,
  coordenadas: Coordenadas | null = null,
): NovaLicitacao {
  return {
    id: licitacao.id,
    orgao: licitacao.orgao,
    cnpj: licitacao.cnpj ?? '',
    esfera: licitacao.esfera,
    uf: licitacao.uf,
    municipio: licitacao.municipio,
    codigoIbge: licitacao.codigoIbge ?? '',
    objeto: licitacao.objeto,
    informacaoComplementar: licitacao.informacaoComplementar ?? null,
    textoBusca: textoBuscaDe(licitacao),
    modalidade: licitacao.modalidade,
    numeroCompra: licitacao.numeroCompra ?? null,
    numeroControlePncp: licitacao.numeroControlePncp ?? null,
    anoCompra: licitacao.anoCompra ?? null,
    sequencialCompra: licitacao.sequencialCompra ?? null,
    valorEstimado: licitacao.valorEstimado ?? null,
    dataPublicacao: paraData(licitacao.dataPublicacao),
    dataAberturaProposta: paraData(licitacao.dataAberturaProposta),
    dataEncerramentoProposta: paraData(licitacao.dataEncerramentoProposta),
    link: licitacao.link ?? '',
    linkPncp: licitacao.linkPncp ?? '',
    linkSistemaOrigem: licitacao.linkSistemaOrigem ?? null,
    categorias: licitacao.categorias,
    categoriaPrincipal: licitacao.categoriaPrincipal ?? null,
    segmentos: licitacao.segmentos,
    // Resolvido na escrita: a regra de precedencia das abas vira coluna e para
    // de ser calculada a cada query do radar.
    segmentoExclusivo: resolverSegmentoExclusivo(licitacao),
    situacao: licitacao.situacao ?? '',
    origem: licitacao.origem,
    latitude: coordenadas?.lat ?? null,
    longitude: coordenadas?.lng ?? null,
  };
}
