import { describe, expect, it } from 'vitest';
import { agruparPorDia, rotuloDoGroupo } from './agrupar';
import type { Licitacao } from './tipos';

function licitacao(parcial: Partial<Licitacao>): Licitacao {
  return {
    id: '1',
    orgao: 'Órgão',
    cnpj: '',
    esfera: 'Municipal',
    uf: 'PR',
    municipio: 'Curitiba',
    codigoIbge: '4106902',
    objeto: 'Objeto',
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
    link: '',
    linkPncp: '',
    linkSistemaOrigem: null,
    categorias: [],
    categoriaPrincipal: null,
    segmentos: ['cultura'],
    situacao: '',
    origem: 'PNCP — teste',
    ...parcial,
  };
}

describe('agruparPorDia', () => {
  it('agrupa por data e rotula Hoje para a data atual', () => {
    const hoje = new Date().toISOString();
    const grupos = agruparPorDia([
      licitacao({ dataPublicacao: hoje }),
      licitacao({ dataPublicacao: hoje }),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]?.rotulo).toBe('Hoje');
    expect(grupos[0]?.itens).toHaveLength(2);
  });

  it('ordena grupos da data mais recente para a mais antiga', () => {
    const grupos = agruparPorDia([
      licitacao({ dataPublicacao: '2026-09-01T10:00:00-03:00' }),
      licitacao({ dataPublicacao: '2026-09-20T10:00:00-03:00' }),
    ]);
    expect(grupos.map((g) => g.rotulo)).toEqual(['20/09/2026', '01/09/2026']);
  });

  it('coloca itens sem data no final', () => {
    const grupos = agruparPorDia([
      licitacao({ dataPublicacao: '2026-09-01T10:00:00-03:00' }),
      licitacao({ dataPublicacao: null }),
    ]);
    expect(grupos[grupos.length - 1]?.rotulo).toBe('Sem data de publicação');
  });

  it('rotula ontem', () => {
    const d = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(rotuloDoGroupo('01/09/2026')).toBe('01/09/2026');
    expect(['Hoje', 'Ontem']).toContain(agruparPorDia([licitacao({ dataPublicacao: d })])[0]?.rotulo);
  });
});