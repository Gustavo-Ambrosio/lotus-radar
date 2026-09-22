import { describe, expect, it } from 'vitest';
import { aplicarFiltros, FILTROS_INICIAIS, type Filtros } from './filtros';
import type { Licitacao } from './tipos';

function licitacao(parte: Partial<Licitacao>): Licitacao {
  return {
    id: '1',
    orgao: 'Prefeitura Municipal',
    cnpj: '',
    esfera: 'Municipal',
    uf: 'PR',
    municipio: 'Curitiba',
    codigoIbge: '',
    objeto: 'Objeto genérico',
    informacaoComplementar: null,
    modalidade: 'Pregão',
    numeroCompra: null,
    numeroControlePncp: null,
    anoCompra: null,
    sequencialCompra: null,
    valorEstimado: null,
    dataPublicacao: null,
    dataAberturaProposta: null,
    dataEncerramentoProposta: null,
    link: 'https://pncp.gov.br/app/editais',
    linkPncp: 'https://pncp.gov.br/app/editais',
    linkSistemaOrigem: null,
    categorias: ['musica'],
    categoriaPrincipal: 'musica',
    segmentos: ['cultura'],
    situacao: 'Aberta',
    ...parte,
  };
}

describe('aplicarFiltros', () => {
  it('filtra por valor mínimo', () => {
    const comValor = licitacao({ id: 'a', valorEstimado: 1200 });
    const semValor = licitacao({ id: 'b', valorEstimado: null });
    const filtros: Filtros = { ...FILTROS_INICIAIS, valorMinimo: 1000 };
    expect(aplicarFiltros([comValor, semValor], filtros).map((l) => l.id)).toEqual(['a']);
  });

  it('filtra por valor máximo', () => {
    const dentro = licitacao({ id: 'a', valorEstimado: 500 });
    const fora = licitacao({ id: 'b', valorEstimado: 5000 });
    const filtros: Filtros = { ...FILTROS_INICIAIS, valorMaximo: 1000 };
    expect(aplicarFiltros([dentro, fora], filtros).map((l) => l.id)).toEqual(['a']);
  });

  it('filtra somente com valor informado', () => {
    const comValor = licitacao({ id: 'a', valorEstimado: 100 });
    const semValor = licitacao({ id: 'b', valorEstimado: null });
    const filtros: Filtros = { ...FILTROS_INICIAIS, somenteComValor: true };
    expect(aplicarFiltros([comValor, semValor], filtros).map((l) => l.id)).toEqual(['a']);
  });

  it('filtra por data de publicação recente', () => {
    const recente = licitacao({ id: 'a', dataPublicacao: new Date().toISOString() });
    const antiga = licitacao({ id: 'b', dataPublicacao: new Date(Date.now() - 90 * 86400000).toISOString() });
    const filtros: Filtros = { ...FILTROS_INICIAIS, publicadoDias: 30 };
    expect(aplicarFiltros([recente, antiga], filtros).map((l) => l.id)).toEqual(['a']);
  });

  it('ordena por órgão', () => {
    const z = licitacao({ id: 'z', orgao: 'Zoológico Municipal' });
    const a = licitacao({ id: 'a', orgao: 'Assembleia Legislativa' });
    const filtros: Filtros = { ...FILTROS_INICIAIS, ordenacao: 'orgao' };
    expect(aplicarFiltros([z, a], filtros).map((l) => l.id)).toEqual(['a', 'z']);
  });

  it('combina busca e categoria', () => {
    const sim = licitacao({ id: 'a', objeto: 'Shows de música popular', categorias: ['musica'] });
    const naoCategoria = licitacao({
      id: 'b',
      objeto: 'Shows de música popular',
      categorias: ['tecnologia' as string],
      categoriaPrincipal: 'ti-geral',
      segmentos: ['tecnologia'],
    });
    const filtros: Filtros = { ...FILTROS_INICIAIS, busca: 'shows', categorias: ['musica'] };
    expect(aplicarFiltros([sim, naoCategoria], filtros).map((l) => l.id)).toEqual(['a']);
  });
});