import { describe, expect, it } from 'vitest';
import {
  categoriasDoSegmento,
  corCategoria,
  ehDoSegmento,
  principalDoSegmento,
  resolverSegmentoExclusivo,
  rotuloCategoria,
  rotuloSegmento,
} from './segmentos';
import type { Licitacao, Segmento } from './tipos';

function licitacao(objeto: string, segmentos: Segmento[]): Licitacao {
  const categorias = [
    ...(segmentos.includes('cultura') ? ['musica'] : []),
    ...(segmentos.includes('tecnologia') ? ['software'] : []),
  ];
  return {
    id: 't1',
    orgao: 'Orgao Teste',
    cnpj: '00000000000000',
    esfera: 'Municipal',
    uf: 'SP',
    municipio: 'Sao Paulo',
    codigoIbge: '0000000',
    objeto,
    informacaoComplementar: null,
    modalidade: 'Pregrao',
    numeroCompra: null,
    numeroControlePncp: null,
    anoCompra: 2026,
    sequencialCompra: null,
    valorEstimado: null,
    dataPublicacao: '2026-01-01',
    dataAberturaProposta: null,
    dataEncerramentoProposta: null,
    link: 'https://municipio.exemplo/edital',
    linkPncp: 'https://pncp.gov.br/edital',
    linkSistemaOrigem: null,
    categorias,
    categoriaPrincipal: categorias[0] ?? null,
    segmentos,
    situacao: 'publicada',
    origem: 'pncp',
  };
}

describe('segmentos', () => {
  it('rotula categorias e segmentos', () => {
    expect(rotuloCategoria('software')).toBe('Desenvolvimento de software');
    expect(rotuloCategoria('musica')).toBe('Música');
    expect(rotuloCategoria('nao-existe')).toBe('nao-existe');
    expect(corCategoria('software')).toBe('#2563eb');
    expect(corCategoria('nao-existe')).toBe('#6b7280');
    expect(rotuloSegmento('cultura')).toBe('Cultura');
    expect(rotuloSegmento('tecnologia')).toBe('Tecnologia');
  });

  it('resolverSegmentoExclusivo: leitura direta de cultura vence com dupla atribuição', () => {
    const duplaCultura = licitacao('locacao de banda musical para festa da cidade', ['cultura', 'tecnologia']);
    expect(resolverSegmentoExclusivo(duplaCultura)).toBe('cultura');
  });

  it('resolverSegmentoExclusivo: precedente forte de tecnologia vence', () => {
    const duplaTec = licitacao('desenvolvimento de software para gestao publica', ['cultura', 'tecnologia']);
    expect(resolverSegmentoExclusivo(duplaTec)).toBe('tecnologia');
  });

  it('resolverSegmentoExclusivo: cultura sobrepõe palavras de tecnologia no mesmo objeto', () => {
    const arteSom = licitacao('montagem de teatro e espetaculo com equipamento de som', ['cultura', 'tecnologia']);
    expect(resolverSegmentoExclusivo(arteSom)).toBe('cultura');
  });

  it('resolverSegmentoExclusivo: exclui dupla sem sinal forte (não repete nas duas abas)', () => {
    const semSinal = licitacao('prestacao de servicos administrativos', ['cultura', 'tecnologia']);
    expect(resolverSegmentoExclusivo(semSinal)).toBeNull();
  });

  it('resolverSegmentoExclusivo: segmento único decide', () => {
    expect(resolverSegmentoExclusivo(licitacao('feira do livro e exposicao de artes visuais', ['cultura']))).toBe('cultura');
    expect(resolverSegmentoExclusivo(licitacao('compra de licenca de software antivirus', ['tecnologia']))).toBe('tecnologia');
  });

  it('garante visualização exclusiva: nenhuma licitação aparece nas duas abas', () => {
    const casos: Array<[string, Segmento[]]> = [
      ['locacao de banda musical para festa da cidade', ['cultura', 'tecnologia']],
      ['desenvolvimento de software para gestao publica', ['cultura', 'tecnologia']],
      ['montagem de teatro e espetaculo com equipamento de som', ['cultura', 'tecnologia']],
      ['compra de licenca de software antivirus', ['tecnologia']],
      ['feira do livro e exposicao de artes visuais', ['cultura']],
      ['recuperacao de biblioteca da rede municipal', ['cultura', 'tecnologia']],
    ];
    for (const [objeto, segmentos] of casos) {
      const l = licitacao(objeto, segmentos);
      const r = resolverSegmentoExclusivo(l);
      expect(ehDoSegmento(l, 'cultura')).toBe(r === 'cultura');
      expect(ehDoSegmento(l, 'tecnologia')).toBe(r === 'tecnologia');
      expect(ehDoSegmento(l, 'cultura') && ehDoSegmento(l, 'tecnologia')).toBe(false);
    }
  });

  it('agrupa categorias por segmento', () => {
    const cultura = categoriasDoSegmento('cultura');
    const tecnologia = categoriasDoSegmento('tecnologia');
    expect(cultura.length).toBeGreaterThan(0);
    expect(tecnologia.length).toBeGreaterThan(0);
    expect(cultura.map((c) => c.id)).toContain('musica');
    expect(tecnologia.map((c) => c.id)).toContain('software');
  });

  it('principalDoSegmento devolve categoria do segmento informado', () => {
    const l = licitacao('desenvolvimento de software', ['cultura', 'tecnologia']);
    expect(principalDoSegmento(l, 'tecnologia')).toBe('software');
    expect(principalDoSegmento(l, 'cultura')).toBe('musica');
  });
});