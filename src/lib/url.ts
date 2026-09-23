import { FILTROS_INICIAIS, type Filtros } from './filtros';
import type { Segmento } from './tipos';

function parseNumero(valor: string | null): number | null {
  if (valor === null || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

const ORDENACOES: ReadonlyArray<Filtros['ordenacao']> = [
  'prazo',
  'recentes',
  'valor-desc',
  'valor-asc',
  'municipio',
  'orgao',
];

export function segmentoDaUrl(busca: URLSearchParams): Segmento {
  return busca.get('seg') === 'tecnologia' ? 'tecnologia' : 'cultura';
}

export function filtrosDaUrl(busca: URLSearchParams): Filtros {
  const categorias = (busca.get('categorias') ?? '').split(',').filter(Boolean);
  const ordenacaoRaw = busca.get('ordenacao');
  const ordenacao = ORDENACOES.includes(ordenacaoRaw as Filtros['ordenacao'])
    ? (ordenacaoRaw as Filtros['ordenacao'])
    : FILTROS_INICIAIS.ordenacao;

  return {
    busca: busca.get('busca') ?? '',
    categorias,
    uf: (busca.get('uf') ?? '').toUpperCase(),
    municipio: busca.get('municipio') ?? '',
    esfera: busca.get('esfera') ?? '',
    modalidade: busca.get('modalidade') ?? '',
    distanciaMaxKm: parseNumero(busca.get('distancia')),
    prazoMaxDias: parseNumero(busca.get('prazoMaxDias')),
    publicadoDias: parseNumero(busca.get('publicadoDias')),
    valorMinimo: parseNumero(busca.get('valorMinimo')),
    valorMaximo: parseNumero(busca.get('valorMaximo')),
    somenteComValor: busca.get('somenteComValor') === '1',
    ordenacao,
  };
}

export function montarQuery(segmento: Segmento, filtros: Filtros): string {
  const params = new URLSearchParams();
  if (segmento !== 'cultura') params.set('seg', segmento);
  if (filtros.busca) params.set('busca', filtros.busca);
  if (filtros.categorias.length > 0) params.set('categorias', filtros.categorias.join(','));
  if (filtros.uf) params.set('uf', filtros.uf);
  if (filtros.municipio) params.set('municipio', filtros.municipio);
  if (filtros.esfera) params.set('esfera', filtros.esfera);
  if (filtros.modalidade) params.set('modalidade', filtros.modalidade);
  if (filtros.distanciaMaxKm !== null) params.set('distancia', String(filtros.distanciaMaxKm));
  if (filtros.prazoMaxDias !== null) params.set('prazoMaxDias', String(filtros.prazoMaxDias));
  if (filtros.publicadoDias !== null) params.set('publicadoDias', String(filtros.publicadoDias));
  if (filtros.valorMinimo !== null) params.set('valorMinimo', String(filtros.valorMinimo));
  if (filtros.valorMaximo !== null) params.set('valorMaximo', String(filtros.valorMaximo));
  if (filtros.somenteComValor) params.set('somenteComValor', '1');
  if (filtros.ordenacao !== FILTROS_INICIAIS.ordenacao) params.set('ordenacao', filtros.ordenacao);

  const texto = params.toString();
  return texto ? `?${texto}` : '';
}