import { describe, expect, it } from 'vitest';
import { filtrosDaUrl, montarQuery, segmentoDaUrl } from './url';
import type { Filtros } from './filtros';

function deUrl(texto: string): URLSearchParams {
  return new URLSearchParams(texto);
}

describe('url', () => {
  it('lê segmento padrão quando ausente', () => {
    expect(segmentoDaUrl(deUrl(''))).toBe('cultura');
  });

  it('lê segmento tecnologia', () => {
    expect(segmentoDaUrl(deUrl('seg=tecnologia'))).toBe('tecnologia');
  });

  it('lê filtros completos', () => {
    const f = filtrosDaUrl(
      deUrl('seg=tecnologia&busca=rede&categorias=infraestrutura,seguranca&municipio=Curitiba' ),
    );
    expect(f.busca).toBe('rede');
    expect(f.categorias).toEqual(['infraestrutura', 'seguranca']);
    expect(f.municipio).toBe('Curitiba');
  });

  it('lê estado e distância', () => {
    const f = filtrosDaUrl(deUrl('uf=sp&distancia=100'));
    expect(f.uf).toBe('SP');
    expect(f.distanciaMaxKm).toBe(100);
  });

  it('normaliza estado para maiúsculas', () => {
    const f = filtrosDaUrl(deUrl('uf=ba'));
    expect(f.uf).toBe('BA');
  });

  it('lê prazo e valores numéricos', () => {
    const f = filtrosDaUrl(deUrl('prazoMaxDias=7&valorMinimo=1000&valorMaximo=50000&publicadoDias=15'));
    expect(f.prazoMaxDias).toBe(7);
    expect(f.valorMinimo).toBe(1000);
    expect(f.valorMaximo).toBe(50000);
    expect(f.publicadoDias).toBe(15);
  });

  it('ignora números inválidos', () => {
    const f = filtrosDaUrl(deUrl('prazoMaxDias=abc'));
    expect(f.prazoMaxDias).toBeNull();
  });

  it('monta query com somente diferenciais', () => {
    const filtros: Filtros = {
      busca: 'museu',
      categorias: ['cultura-geral'],
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
    const query = montarQuery('cultura', filtros);
    expect(query).toContain('busca=museu');
    expect(query).toContain('categorias=cultura-geral');
    expect(query).not.toContain('seg=');
  });

  it('monta segmento tecnologia na query', () => {
    const filtros: Filtros = {
      busca: '',
      categorias: [],
      uf: 'PR',
      municipio: 'Londrina',
      esfera: '',
      modalidade: '',
      distanciaMaxKm: 100,
      prazoMaxDias: null,
      publicadoDias: null,
      valorMinimo: null,
      valorMaximo: null,
      somenteComValor: true,
      ordenacao: 'recentes',
    };
    const query = montarQuery('tecnologia', filtros);
    expect(query).toContain('seg=tecnologia');
    expect(query).toContain('municipio=Londrina');
    expect(query).toContain('uf=PR');
    expect(query).toContain('distancia=100');
    expect(query).toContain('somenteComValor=1');
    expect(query).toContain('ordenacao=recentes');
  });

  it('descarta categorias de outro segmento vindas da URL', () => {
    const f = filtrosDaUrl(deUrl('seg=tecnologia&categorias=eventos-festivais,software,licencas'));
    expect(f.categorias).toEqual(['software', 'licencas']);
  });

  it('mantém categorias do segmento na URL', () => {
    const f = filtrosDaUrl(deUrl('seg=cultura&categorias=musica,eventos-festivais'));
    expect(f.categorias).toEqual(['musica', 'eventos-festivais']);
  });

  it('descarta categorias desconhecidas', () => {
    const f = filtrosDaUrl(deUrl('seg=cultura&categorias=nao-existe,musica'));
    expect(f.categorias).toEqual(['musica']);
  });
});
