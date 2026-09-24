import { afterEach, describe, expect, it, vi } from 'vitest';
import { coletarPnabLicitacoes, lerPnabDoCache } from './coletar-pnab';


function dataPhp(ano: number, mes: number, dia: number, hora = '00', minuto = '00'): { date: string } {
  const p = (n: number) => String(n).padStart(2, '0');
  return { date: `${ano}-${p(mes)}-${p(dia)} ${hora}:${minuto}:00.000000` };
}

function oportunidadeBase(over: Record<string, unknown>): Record<string, unknown> {
  return {
    id: 8012,
    name: 'EDITAL DE INTERCÂMBIO CULTURAL MINC Nº 1, DE 2026',
    type: { id: 9, name: 'Edital' },
    registrationFrom: dataPhp(2026, 9, 1),
    registrationTo: dataPhp(2026, 11, 6),
    createTimestamp: dataPhp(2026, 8, 20),
    owner: { id: 100, name: 'Secretaria do Audiovisual', En_Estado: 'DF', En_Municipio: 'Brasília' },
    singleUrl: 'https://mapa.cultura.gov.br/oportunidade/8012/',
    ...over,
  };
}

function stubResposta(lote: unknown[]): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    headers: { get: () => 'application/json' },
    json: async () => lote,
  })));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('coletarPnabLicitacoes', () => {
  it('monta licitação a partir de oportunidade do Mapa da Cultura', async () => {
    stubResposta([oportunidadeBase({})]);
    const items = await coletarPnabLicitacoes();
    expect(items).toHaveLength(1);
    const item = items[0]!;
    expect(item.id).toBe('pnab-8012');
    expect(item.orgao).toBe('Secretaria do Audiovisual');
    expect(item.uf).toBe('DF');
    expect(item.esfera).toBe('Federal');
    expect(item.modalidade).toBe('Edital de fomento');
    expect(item.link).toBe('https://mapa.cultura.gov.br/oportunidade/8012/');
    expect(item.dataEncerramentoProposta).toBe('2026-11-06T00:00:00-03:00');
    expect(item.origem).toContain('PNAB');
  });

  it('ignora oportunidades com encerramento em fluxo contínuo (data muito distante)', async () => {
    stubResposta([
      oportunidadeBase({ id: 5181, name: 'Cadastro Nacional de Pontos de Cultura', registrationTo: dataPhp(2111, 1, 1) }),
      oportunidadeBase({ id: 8012 }),
    ]);
    const items = await coletarPnabLicitacoes();
    expect(items.map((i) => i.id)).toEqual(['pnab-8012']);
  });

  it('mantém edital com prazo futuro razoável', async () => {
    stubResposta([
      oportunidadeBase({
        id: 11882,
        name: 'Programa Ciclos de Saberes e Conhecimentos',
        registrationTo: dataPhp(2026, 10, 20),
      }),
    ]);
    const items = await coletarPnabLicitacoes();
    expect(items.map((i) => i.id)).toEqual(['pnab-11882']);
    expect(items[0]!.dataEncerramentoProposta).toBe('2026-10-20T00:00:00-03:00');
  });

  it('descarta títulos de teste', async () => {
    stubResposta([oportunidadeBase({ id: 6873, name: 'TESTE EDITAL 0026' })]);
    const items = await coletarPnabLicitacoes();
    expect(items).toHaveLength(0);
  });

  it('inferir esfera Estadual para órgão estadual', async () => {
    stubResposta([
      oportunidadeBase({
        owner: { id: 10, name: 'Secretaria de Estado da Cultura', En_Estado: 'SP', En_Municipio: 'São Paulo' },
      }),
    ]);
    const items = await coletarPnabLicitacoes();
    expect(items[0]!.esfera).toBe('Estadual');
    expect(items[0]!.uf).toBe('SP');
  });

  it('inferir esfera Municipal para prefeitura', async () => {
    stubResposta([
      oportunidadeBase({
        owner: { id: 11, name: 'Prefeitura de Ibiassucê', En_Estado: 'BA', En_Municipio: 'Ibiassucê' },
      }),
    ]);
    const items = await coletarPnabLicitacoes();
    expect(items[0]!.esfera).toBe('Municipal');
    expect(items[0]!.municipio).toBe('Ibiassucê');
  });

  it('usa fallback de órgão, UF BR e esfera não informada quando owner ausente', async () => {
    const semOwner = oportunidadeBase({});
    delete semOwner.owner;
    stubResposta([semOwner]);
    const items = await coletarPnabLicitacoes();
    expect(items[0]!.orgao).toContain('Mapa da Cultura');
    expect(items[0]!.uf).toBe('BR');
    expect(items[0]!.esfera).toBe('Não informada');
  });

  it('exporta leitor de cache', () => {
    expect(lerPnabDoCache).toBeTypeOf('function');
  });

  it('interrompe paginação quando a API devolve página vazia', async () => {
    const chamadas: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      chamadas.push(String(url));
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => (chamadas.length === 1 ? [oportunidadeBase({})] : []),
      };
    }));
    const items = await coletarPnabLicitacoes();
    expect(items).toHaveLength(1);
    expect(chamadas).toHaveLength(1);
  });
});