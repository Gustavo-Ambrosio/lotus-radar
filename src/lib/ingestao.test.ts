import { describe, expect, it } from 'vitest';
import { paraData, paraLinha, textoBuscaDe } from './ingestao';
import type { Licitacao } from './tipos';

const BASE: Licitacao = {
  id: '07252975000156-1-000029/2026',
  orgao: 'FUNDACAO MUNICIPAL DE CULTURA',
  cnpj: '07252975000156',
  esfera: 'Municipal',
  uf: 'MG',
  municipio: 'Belo Horizonte',
  codigoIbge: '3106200',
  objeto: 'SELECAO DE PROPOSTAS DE PESQUISA EM DANCA',
  informacaoComplementar: 'Concurso de fomento.',
  modalidade: 'Concurso',
  numeroCompra: '2',
  numeroControlePncp: '07252975000156-1-000029/2026',
  anoCompra: 2026,
  sequencialCompra: 29,
  valorEstimado: 100000,
  dataPublicacao: '2026-08-03T10:04:18-03:00',
  dataAberturaProposta: '2026-08-10T08:00:00-03:00',
  dataEncerramentoProposta: '2026-10-24T17:00:00-03:00',
  link: 'https://pncp.gov.br/app/editais/07252975000156/2026/29',
  linkPncp: 'https://pncp.gov.br/app/editais/07252975000156/2026/29',
  linkSistemaOrigem: null,
  categorias: ['artes-cenicas'],
  categoriaPrincipal: 'artes-cenicas',
  segmentos: ['cultura'],
  situacao: 'Divulgada no PNCP',
  origem: 'PNCP',
};

describe('paraData', () => {
  it('converte ISO com fuso em Date', () => {
    expect(paraData('2026-08-03T10:04:18-03:00')?.toISOString()).toBe('2026-08-03T13:04:18.000Z');
  });

  it('devolve null para ausente ou data invalida', () => {
    expect(paraData(null)).toBeNull();
    expect(paraData('')).toBeNull();
    expect(paraData('nao-e-data')).toBeNull();
  });
});

describe('textoBuscaDe', () => {
  it('normaliza acentos e junta objeto, orgao e municipio', () => {
    expect(textoBuscaDe(BASE)).toBe(
      'selecao de propostas de pesquisa em danca fundacao municipal de cultura belo horizonte',
    );
  });

  it('independe da ordem e ignora pontuacao', () => {
    const a = textoBuscaDe({ objeto: 'Festival de Música', orgao: 'A', municipio: 'B' });
    const b = textoBuscaDe({ objeto: 'festival  de musica!', orgao: 'A', municipio: 'B' });
    expect(a).toBe(b);
  });
});

describe('paraLinha', () => {
  it('mapeia todos os campos consultaveis', () => {
    const linha = paraLinha(BASE, { lat: -19.9167, lng: -43.9345 });
    expect(linha.id).toBe(BASE.id);
    expect(linha.textoBusca).toContain('danca');
    expect(linha.latitude).toBeCloseTo(-19.9167);
    expect(linha.longitude).toBeCloseTo(-43.9345);
    expect(linha.categorias).toEqual(['artes-cenicas']);
    expect(linha.segmentos).toEqual(['cultura']);
    expect(linha.valorEstimado).toBe(100000);
  });

  it('materializa a aba unica pela regra de precedencia', () => {
    expect(paraLinha(BASE).segmentoExclusivo).toBe('cultura');
  });

  it('deixa a aba nula quando o item cai nos dois segmentos sem sinal claro', () => {
    const ambigua: Licitacao = {
      ...BASE,
      objeto: 'CONTRATACAO DE SERVICOS DE APOIO ADMINISTRATIVO',
      segmentos: ['cultura', 'tecnologia'],
    };
    expect(paraLinha(ambigua).segmentoExclusivo).toBeNull();
  });

  it('deixa coordenadas nulas quando o municipio e desconhecido', () => {
    const linha = paraLinha(BASE);
    expect(linha.latitude).toBeNull();
    expect(linha.longitude).toBeNull();
  });

  it('normaliza ausentes em null, sem inventar valor zero', () => {
    const linha = paraLinha({
      ...BASE,
      valorEstimado: null,
      informacaoComplementar: null,
      dataEncerramentoProposta: null,
      numeroCompra: null,
    });
    expect(linha.valorEstimado).toBeNull();
    expect(linha.informacaoComplementar).toBeNull();
    expect(linha.dataEncerramentoProposta).toBeNull();
    expect(linha.numeroCompra).toBeNull();
  });
});
