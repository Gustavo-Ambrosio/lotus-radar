import type { Licitacao } from './tipos';
import { diasRestantes } from './formato';
import { normalizarTexto } from './texto';
import { coordenadasDeLicitacao, distanciaKm, type Coordenadas } from './geo';

export interface Filtros {
  busca: string;
  categorias: string[];
  uf: string;
  municipio: string;
  esfera: string;
  modalidade: string;
  distanciaMaxKm: number | null;
  prazoMaxDias: number | null;
  publicadoDias: number | null;
  valorMinimo: number | null;
  valorMaximo: number | null;
  somenteComValor: boolean;
  ordenacao: 'prazo' | 'recentes' | 'valor-desc' | 'valor-asc' | 'municipio' | 'orgao';
}

export const FILTROS_INICIAIS: Filtros = {
  busca: '',
  categorias: [],
  uf: '',
  municipio: '',
  esfera: '',
  modalidade: '',
  distanciaMaxKm: null,
  prazoMaxDias: null,
  publicadoDias: null,
  valorMinimo: null,
  valorMaximo: null,
  somenteComValor: false,
  ordenacao: 'prazo',
};

export function aplicarFiltros(
  lista: Licitacao[],
  filtros: Filtros,
  localizacao?: Coordenadas | null,
): Licitacao[] {
  const busca = normalizarTexto(filtros.busca);

  const filtrada = lista.filter((item) => {
    if (busca) {
      const alvo = normalizarTexto(`${item.objeto} ${item.orgao} ${item.municipio}`);
      if (!alvo.includes(busca)) return false;
    }
    if (filtros.categorias.length > 0 && !filtros.categorias.some((c) => item.categorias.includes(c))) {
      return false;
    }
    if (filtros.uf && item.uf !== filtros.uf) return false;
    if (filtros.municipio && item.municipio !== filtros.municipio) return false;
    if (filtros.esfera && item.esfera !== filtros.esfera) return false;
    if (filtros.modalidade && item.modalidade !== filtros.modalidade) return false;
    if (filtros.distanciaMaxKm !== null && localizacao) {
      const origem = coordenadasDeLicitacao(item.uf, item.municipio);
      if (!origem) return false;
      if (distanciaKm(localizacao, origem) > filtros.distanciaMaxKm) return false;
    }
    if (filtros.prazoMaxDias !== null) {
      const dias = diasRestantes(item.dataEncerramentoProposta);
      if (dias === null || dias > filtros.prazoMaxDias) return false;
    }
    if (filtros.publicadoDias !== null) {
      const publicado = item.dataPublicacao ? new Date(item.dataPublicacao).getTime() : null;
      if (publicado === null) return false;
      const limite = Date.now() - filtros.publicadoDias * 24 * 60 * 60 * 1000;
      if (publicado < limite) return false;
    }
    if (filtros.somenteComValor && item.valorEstimado === null) return false;
    if (filtros.valorMinimo !== null && (item.valorEstimado === null || item.valorEstimado < filtros.valorMinimo)) {
      return false;
    }
    if (filtros.valorMaximo !== null && (item.valorEstimado === null || item.valorEstimado > filtros.valorMaximo)) {
      return false;
    }
    return true;
  });

  return ordenar(filtrada, filtros.ordenacao);
}

function ordenar(lista: Licitacao[], ordenacao: Filtros['ordenacao']): Licitacao[] {
  const copia = [...lista];
  switch (ordenacao) {
    case 'recentes':
      copia.sort(
        (a, b) =>
          new Date(b.dataPublicacao ?? 0).getTime() - new Date(a.dataPublicacao ?? 0).getTime(),
      );
      break;
    case 'valor-desc':
      copia.sort((a, b) => (b.valorEstimado ?? -1) - (a.valorEstimado ?? -1));
      break;
    case 'valor-asc':
      copia.sort((a, b) => (a.valorEstimado ?? Infinity) - (b.valorEstimado ?? Infinity));
      break;
    case 'municipio':
      copia.sort((a, b) => a.municipio.localeCompare(b.municipio, 'pt-BR'));
      break;
    case 'orgao':
      copia.sort((a, b) => a.orgao.localeCompare(b.orgao, 'pt-BR'));
      break;
    case 'prazo':
    default:
      copia.sort((a, b) => {
        const da = a.dataEncerramentoProposta ? new Date(a.dataEncerramentoProposta).getTime() : Infinity;
        const db = b.dataEncerramentoProposta ? new Date(b.dataEncerramentoProposta).getTime() : Infinity;
        return da - db;
      });
      break;
  }
  return copia;
}

export function valoresUnicos(lista: Licitacao[], seletor: (item: Licitacao) => string): string[] {
  const conjunto = new Set<string>();
  for (const item of lista) {
    const valor = seletor(item);
    if (valor) conjunto.add(valor);
  }
  return [...conjunto].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}