import { describe, expect, it } from 'vitest';
import { licitacoesParaCsv } from './exportar';
import type { Licitacao } from './tipos';

function licitacao(parcial: Partial<Licitacao>): Licitacao {
  return {
    id: '1',
    orgao: 'Estado;Uso Teste',
    cnpj: '',
    esfera: 'Estadual',
    uf: 'PR',
    municipio: 'Curitiba',
    codigoIbge: '4106902',
    objeto: 'Apoio a museu',
    informacaoComplementar: null,
    modalidade: 'Chamamento',
    numeroCompra: null,
    numeroControlePncp: '123',
    anoCompra: null,
    sequencialCompra: null,
    valorEstimado: 1000,
    dataPublicacao: '2026-09-01T10:00:00-03:00',
    dataAberturaProposta: null,
    dataEncerramentoProposta: null,
    link: '',
    linkPncp: 'https://pncp.gov.br',
    linkSistemaOrigem: null,
    categorias: ['cultura-geral'],
    categoriaPrincipal: 'cultura-geral',
    segmentos: ['cultura'],
    situacao: '',
    ...parcial,
  };
}

describe('licitacoesParaCsv', () => {
  it('produz cabeçalho com BOM e linha de dados escapada', () => {
    const csv = licitacoesParaCsv([licitacao({})]);
    expect(csv.startsWith('\uFEFFObjeto;')).toBe(true);
    expect(csv).toContain('"Estado;Uso Teste"');
    expect(csv).toContain('Apoio a museu');
    expect(csv).toContain('1.000,00');
    expect(csv).toContain('R$');
  });
});