import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  carregarMunicipios,
  definirMunicipios,
  distanciaKm,
  municipiosCarregados,
  municipioPorNome,
  municipiosDoEstado,
  NOME_UF,
  UFS_ORDENADAS,
} from './geo';
import { MUNICIPIOS_BR } from './municipios-br';

beforeEach(() => {
  definirMunicipios(MUNICIPIOS_BR);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('geo', () => {
  it('calcula distância aproximada entre Curitiba e Londrina', () => {
    const curitiba = { lat: -25.4284, lng: -49.2733 };
    const londrina = { lat: -23.2927, lng: -51.1656 };
    const km = distanciaKm(curitiba, londrina);
    expect(km).toBeGreaterThan(300);
    expect(km).toBeLessThan(420);
  });

  it('detecta distância muito grande', () => {
    const curitiba = { lat: -25.4284, lng: -49.2733 };
    const manaus = { lat: -3.119, lng: -60.0217 };
    expect(distanciaKm(curitiba, manaus)).toBeGreaterThan(2500);
  });

  it('lista 27 UFs ordenadas', () => {
    expect(UFS_ORDENADAS.length).toBe(27);
    expect(UFS_ORDENADAS[0]).toBe('AC');
  });

  it('tem nome para todas as UFs', () => {
    for (const uf of UFS_ORDENADAS) {
      expect(NOME_UF[uf]).toBeTruthy();
    }
  });

  it('contém todos os municípios brasileiros sem duplicatas', () => {
    expect(MUNICIPIOS_BR.length).toBeGreaterThan(5500);
    const codigos = new Set(MUNICIPIOS_BR.map((m) => m.codigoIbge));
    expect(codigos.size).toBe(MUNICIPIOS_BR.length);
  });

  it('agrupa municípios por estado', () => {
    const sp = municipiosDoEstado('SP');
    expect(sp.length).toBeGreaterThan(600);
    expect(sp.every((m) => m.uf === 'SP')).toBe(true);
  });

  it('encontra município por nome normalizado', () => {
    const m = municipioPorNome('curitiba');
    expect(m?.uf).toBe('PR');
    expect(m?.codigoIbge).toBeTruthy();
  });

  it('encontra municípios recém-criados', () => {
    expect(municipioPorNome('Boa Esperança do Norte')?.uf).toBe('MT');
    expect(municipioPorNome('Pinto Bandeira')?.uf).toBe('RS');
  });

  it('carrega municípios do arquivo no formato compacto', async () => {
    const corpo = JSON.stringify([['4104901', 'PR', 'Curitiba', -25.43, -49.27]]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(corpo, { status: 200 })),
    );
    definirMunicipios([]);
    expect(municipiosCarregados()).toBe(false);

    const carregados = await carregarMunicipios();
    expect(carregados).toHaveLength(1);
    expect(municipiosCarregados()).toBe(true);
    expect(municipioPorNome('curitiba')?.uf).toBe('PR');
  });

  it('fica sem dados quando o carregamento falha', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('erro', { status: 404 })),
    );
    definirMunicipios([]);
    await expect(carregarMunicipios()).rejects.toThrow(/404/);
    expect(municipiosCarregados()).toBe(false);
  });
});